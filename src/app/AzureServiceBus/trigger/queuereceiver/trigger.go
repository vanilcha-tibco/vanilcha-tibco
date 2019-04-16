package queuereceiver

import (
	"context"
	"fmt"
	"strconv"
	"time"

	azservicebus "git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus"
	servicebus "github.com/Azure/azure-service-bus-go"
	"github.com/TIBCOSoftware/flogo-lib/core/data"
	"github.com/TIBCOSoftware/flogo-lib/core/trigger"
	"github.com/TIBCOSoftware/flogo-lib/logger"
)

// MyTriggerFactory My Trigger factory
type MyTriggerFactory struct {
	metadata *trigger.Metadata
}

//NewFactory create a new Trigger factory
func NewFactory(md *trigger.Metadata) trigger.Factory {
	return &MyTriggerFactory{metadata: md}
}

//New Creates a new trigger instance for a given id
func (t *MyTriggerFactory) New(config *trigger.Config) trigger.Trigger {
	return &SBQueueReceiverTrigger{metadata: t.metadata, config: config}
}

var log = logger.GetLogger("AzureServiceBus-trigger-queuereceiver")

// SBQueueReceiverTrigger is a stub for your Trigger implementation
type SBQueueReceiverTrigger struct {
	metadata       *trigger.Metadata
	config         *trigger.Config
	queueReceivers []*QueueReceiver
}

// QueueReceiver is structure of a single QueueReceiver
type QueueReceiver struct {
	handler            *trigger.Handler
	q                  *servicebus.Queue
	stepSessionHandler *StepSessionHandler
	sessionID          string
	//listenerHandler     *servicebus.ListenerHandle
	listenctxCancelFunc context.CancelFunc
	queueName           string
	connString          string
	valueType           string
	receiveMode         string
	done                chan bool
}

// StepSessionHandler is a comment
type StepSessionHandler struct {
	messageSession *servicebus.MessageSession
	valueType      string
	queueName      string
	handler        *trigger.Handler
}

// Start is called when a new session is started
func (ssh *StepSessionHandler) Start(ms *servicebus.MessageSession) error {
	ssh.messageSession = ms
	if ssh.messageSession.SessionID() != nil {
		log.Infof("Begin session: ", *ssh.messageSession.SessionID())
	} else {
		log.Infof("Begin listening to all sessions for the queue: ", ssh.queueName)
	}

	return nil
}

// Handle is called when a new session message is received
func (ssh *StepSessionHandler) Handle(ctx context.Context, msg *servicebus.Message) error {
	err2 := ssh.processMessage(msg, ssh.handler, ssh.valueType, ssh.queueName)
	if err2 == nil {
		return msg.Complete(ctx)
	}
	return msg.Abandon(ctx)
}

// End is called when the message session is closed. Service Bus will not automatically end your message session. Be
// sure to know when to terminate your own session.
func (ssh *StepSessionHandler) End() {
	if ssh.messageSession.SessionID() != nil {
		log.Infof("End session: ", *ssh.messageSession.SessionID())
	} else {
		log.Infof("End session handler for all sessions: ")
	}
	log.Debugf("")
}

// Initialize QueueReceiverTrigger
func (t *SBQueueReceiverTrigger) Initialize(ctx trigger.InitContext) error {

	config, err := azservicebus.BuildConfigurationFromConnection(t.config.Settings["azservicebusConnection"])
	if err != nil {
		return fmt.Errorf("Failed to load Azure Service Bus connection configuration. %s", err.Error())
	}

	for _, handler := range ctx.GetHandlers() {

		queueName := handler.GetStringSetting("queue")
		receiveMode := handler.GetStringSetting("receiveMode")
		valueType := handler.GetStringSetting("valueType")
		sessionID := handler.GetStringSetting("sessionId")
		connStr := "Endpoint=sb://" + config.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + config.AuthorizationRuleName + ";SharedAccessKey=" + config.PrimarysecondaryKey
		qrcvr := &QueueReceiver{}
		qrcvr.handler = handler
		qrcvr.connString = connStr
		qrcvr.queueName = queueName
		qrcvr.receiveMode = receiveMode
		qrcvr.valueType = valueType
		qrcvr.sessionID = sessionID
		qrcvr.done = make(chan bool)
		t.queueReceivers = append(t.queueReceivers, qrcvr)
	}

	return nil
}

func getIntValue(val interface{}, ok bool) (intVal int) {
	if !ok {
		intVal = 0
	}
	intVal, _ = data.CoerceToInteger(val)
	return
}

// Metadata implements trigger.Trigger.Metadata
func (t *SBQueueReceiverTrigger) Metadata() *trigger.Metadata {
	return t.metadata
}

// Start implements trigger.Trigger.Start
func (t *SBQueueReceiverTrigger) Start() error {
	log.Infof("Starting Trigger - %s", t.config.Name)

	for _, qrcvr := range t.queueReceivers {

		ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(qrcvr.connString))
		if err != nil {
			log.Error(err.Error())
			return err
		}
		q, err := getQueue(ns, qrcvr.queueName, qrcvr.receiveMode)
		if err != nil {
			log.Error(err.Error())
			return err
		}
		qrcvr.q = q
		// Start polling on a separate Go routine so as to not block engine
		go qrcvr.listen()
	}
	log.Infof("Trigger - %s  started", t.config.Name)
	return nil
}

func getQueue(ns *servicebus.Namespace, queueName string, receiveMode string) (*servicebus.Queue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	qm := ns.NewQueueManager()
	qe, err := qm.Get(ctx, queueName)
	if err != nil {
		log.Error(err.Error())
		return nil, err
	}

	if qe == nil {
		_, err := qm.Put(ctx, queueName)
		if err != nil {
			log.Error(err.Error())
			return nil, err
		}
	}
	if receiveMode == "ReceiveAndDelete" {
		//fmt.Println("receiveMode for QueueReceiver is set to ReceiveAndDelete")
		log.Debugf("Using receiveMode ReceiveAndDelete to create queue %s", queueName)
		q, err := ns.NewQueue(queueName, servicebus.QueueWithReceiveAndDelete())
		return q, err
	}
	//fmt.Println("receiveMode for QueueReceiver is PeekLock")
	log.Debugf("Using receiveMode PeekLock to create queue %s", queueName)
	q, err := ns.NewQueue(queueName)
	return q, err

}

func (qrcvr *QueueReceiver) listen() {
	//fmt.Println("Setting up listener...")
	//ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	ctx, cancel := context.WithCancel(context.Background())

	qrcvr.listenctxCancelFunc = cancel
	queueSession := &servicebus.QueueSession{}
	if qrcvr.sessionID != "" {
		queueSession = qrcvr.q.NewSession(&qrcvr.sessionID)
	} else {
		queueSession = qrcvr.q.NewSession(nil)
	}

	ssh := &StepSessionHandler{}
	ssh.valueType = qrcvr.valueType
	ssh.handler = qrcvr.handler
	ssh.queueName = qrcvr.queueName

	qrcvr.stepSessionHandler = ssh

	err := queueSession.ReceiveOne(ctx, ssh)

	if err != nil {
		log.Error(err.Error())
		return
	}

	defer cancel()

	//fmt.Println("I am listening...")
	log.Infof("QueueReceiver is now polling on Queue [%s]", qrcvr.queueName)
	select {
	case <-qrcvr.done:
		log.Debugf("Polling on Queue [%s] is stopped as the Trigger was stopped ", qrcvr.queueName)
		// Exit
		return
	}

}

func (ssh *StepSessionHandler) processMessage(msg *servicebus.Message, handler *trigger.Handler, valueType string, queueName string) error {
	// log.Infof("Processing record from Topic[%s], Partition[%d], Offset[%d]", msg.Topic, msg.Partition, msg.Offset)
	var outputRoot = map[string]interface{}{}
	var brokerProperties = map[string]interface{}{}
	outputData := make(map[string]interface{})

	if msg.Data != nil {
		deserVal := valueType
		if deserVal == "String" {
			text := string(msg.Data)
			outputRoot["messageString"] = string(text)
			brokerProperties["ContentType"] = msg.ContentType
			brokerProperties["CorrelationId"] = msg.CorrelationID
			//brokerPropertiesResp["DeliveryCount"] = msg.DeliveryCount
			brokerProperties["Label"] = msg.Label
			//brokerPropertiesResp["MessageId"] = msg.ID
			brokerProperties["PartitionKey"] = &msg.SystemProperties.PartitionKey
			brokerProperties["ReplyTo"] = msg.ReplyTo
			ttl := msg.TTL.String()
			ttlint, _ := strconv.Atoi(ttl)
			brokerProperties["TimeToLive"] = ttlint
			brokerProperties["To"] = msg.To
			//brokerPropertiesResp["ViaPartitionKey"] = msg.SystemProperties.ViaPartitionKey
			complexBrokerProperties := &data.ComplexObject{Metadata: "", Value: brokerProperties}
			outputRoot["brokerProperties"] = complexBrokerProperties.Value

			outputComplex := &data.ComplexObject{Metadata: "", Value: outputRoot}
			outputData["output"] = outputComplex
		} else if deserVal == "JSON" {
			// future use
		}
	}

	_, err := handler.Handle(context.Background(), outputData)
	if err != nil {
		log.Errorf("Failed to process record from Queue [%s], due to error - %s", queueName, err.Error())
	} else {
		// record is successfully processed.
		log.Infof("Record from Queue [%s] is successfully processed", queueName)
	}
	return err
}

// Stop implements trigger.Trigger.Start
func (t *SBQueueReceiverTrigger) Stop() error {
	log.Infof("Stopping Trigger - %s", t.config.Name)
	for _, qrcvr := range t.queueReceivers {
		// Stop polling
		qrcvr.done <- true
		//fmt.Println("closing after 2 seconds")
		log.Debugf("About to close ListenerHandler for Queue [%s]", qrcvr.queueName)
		select {
		case <-time.After(2 * time.Second):
			qrcvr.stepSessionHandler.messageSession.Close()
		}
		qrcvr.listenctxCancelFunc()
	}

	log.Infof("Trigger - %s  stopped", t.config.Name)
	return nil
}
