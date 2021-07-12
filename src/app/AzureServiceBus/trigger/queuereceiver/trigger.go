package queuereceiver

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	azureservicebusconnection "git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus/connector/connection"
	servicebus "github.com/Azure/azure-service-bus-go"
	"github.com/project-flogo/core/data/metadata"
	"github.com/project-flogo/core/support/log"
	"github.com/project-flogo/core/trigger"
)

//OssUpgrade
var logCache = log.ChildLogger(log.RootLogger(), "azureservicebus-trigger")

var triggerMd = trigger.NewMetadata(&HandlerSettings{}, &Output{})

func init() {
	_ = trigger.Register(&SBQueueReceiverTrigger{}, &MyTriggerFactory{})
}

// MyTriggerFactory My Trigger factory
type MyTriggerFactory struct {
	metadata *trigger.Metadata
}

//NewFactory create a new Trigger factory
func NewFactory(md *trigger.Metadata) trigger.Factory {
	return &MyTriggerFactory{metadata: md}
}

//New Creates a new trigger instance for a given id
func (t *MyTriggerFactory) New(config *trigger.Config) (trigger.Trigger, error) {
	return &SBQueueReceiverTrigger{metadata: t.metadata, config: config}, nil
}

// Metadata implements trigger.Factory.Metadata
func (*MyTriggerFactory) Metadata() *trigger.Metadata {
	return triggerMd
}

// SBQueueReceiverTrigger is a stub for your Trigger implementation
type SBQueueReceiverTrigger struct {
	metadata       *trigger.Metadata
	config         *trigger.Config
	queueReceivers []*QueueReceiver
}

// QueueReceiver is structure of a single QueueReceiver
type QueueReceiver struct {
	handler            trigger.Handler
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
	isSession           bool
	deadLetter          *servicebus.DeadLetter
	isDeadLetter        bool
	timeOut             int
	ctx                 context.Context
	count               int
	interval            int
}

// StepSessionHandler is a comment
type StepSessionHandler struct {
	messageSession *servicebus.MessageSession
	valueType      string
	queueName      string
	handler        trigger.Handler
}

// Start is called when a new session is started
func (ssh *StepSessionHandler) Start(ms *servicebus.MessageSession) error {
	ssh.messageSession = ms
	if ssh.messageSession.SessionID() != nil {
		logCache.Infof("Begin session: %s", *ssh.messageSession.SessionID())
	} else {
		logCache.Infof("Begin listening to all sessions for the queue: %s", ssh.queueName)
	}

	return nil
}

// Handle is called when a new session message is received
func (ssh *StepSessionHandler) Handle(ctx context.Context, msg *servicebus.Message) error {
	err2 := processMessage(msg, ssh.handler, ssh.valueType, ssh.queueName, true)
	if err2 == nil {
		return msg.Complete(ctx)
	}
	return msg.Abandon(ctx)
}

// End is called when the message session is closed. Service Bus will not automatically end your message session. Be
// sure to know when to terminate your own session.
func (ssh *StepSessionHandler) End() {
	if ssh.messageSession.SessionID() != nil {
		logCache.Infof("Ending session: %s", *ssh.messageSession.SessionID())
	} else {
		logCache.Infof("Ending session handler for all sessions: ")
	}
}

// Initialize QueueReceiverTrigger
func (t *SBQueueReceiverTrigger) Initialize(ctx trigger.InitContext) error {

	ctx.Logger().Info("Initializing AzureServiceBus Trigger Context...")

	for _, handler := range ctx.GetHandlers() {

		handlerSettings := &HandlerSettings{}
		var err error
		err = metadata.MapToStruct(handler.Settings(), handlerSettings, true)
		if err != nil {
			return fmt.Errorf("Error occured in metadata.MapToStruct, error - [%s]", err.Error())
		}
		//fmt.Println("Printingcustomlogs")
		//str := fmt.Sprintf("%v", handler.Settings()["azservicebusConnection"])
		//fmt.Println(str)
		//fmt.Println("PrintingAllValuesOFinterface")
		//b, err := json.Marshal(handler.Settings())
		//if err != nil {
		//	fmt.Errorf("ERROR")
		//}
		//fmt.Println(string(b))

		handlerSettings.Connection, err = azureservicebusconnection.GetSharedConfiguration(handler.Settings()["azservicebusConnection"])
		if err != nil {
			return err
		}

		asbscm, _ := handlerSettings.Connection.(*azureservicebusconnection.AzureServiceBusSharedConfigManager)

		queueName := handlerSettings.Queue
		receiveMode := handlerSettings.ReceiveMode
		valueType := handlerSettings.ValueType
		sessionID := handlerSettings.SessionId
		connStr := "Endpoint=sb://" + asbscm.AzureToken.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + asbscm.AzureToken.AuthorizationRuleName + ";SharedAccessKey=" + asbscm.AzureToken.PrimarysecondaryKey
		qrcvr := &QueueReceiver{}
		qrcvr.handler = handler
		qrcvr.connString = connStr
		qrcvr.queueName = queueName
		qrcvr.receiveMode = receiveMode
		qrcvr.valueType = valueType
		qrcvr.sessionID = sessionID
		qrcvr.done = make(chan bool)
		qrcvr.isDeadLetter = handlerSettings.Deadletter
		qrcvr.timeOut = handlerSettings.Timeout
		qrcvr.count = handlerSettings.Count
		qrcvr.interval = handlerSettings.Interval
		t.queueReceivers = append(t.queueReceivers, qrcvr)
	}

	return nil
}

//func getIntValue(val interface{}, ok bool) (intVal int) {
//	if !ok {
//intVal = 0
//}
//intVal, _ = data.CoerceToInteger(val)
//return
//}

// please check later this is required or not
//func (t *SBQueueReceiverTrigger) Metadata() *trigger.Metadata {
//return t.metadata
//}

// Start implements trigger.Trigger.Start
func (t *SBQueueReceiverTrigger) Start() error {

	//log.Infof("Starting Trigger - %s", t.config.Name)
	for _, qrcvr := range t.queueReceivers {
		ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(qrcvr.connString))
		if err != nil {
			logCache.Error(err.Error())
			return err
		}
		if qrcvr.isDeadLetter {
			q, isSession, err := getDeadLetter(ns, qrcvr.queueName, qrcvr.receiveMode, qrcvr)
			if err != nil {
				logCache.Error(err.Error())
				return err
			}
			qrcvr.deadLetter = q
			qrcvr.isSession = isSession
			go qrcvr.listenDeadletter()
		} else {
			q, isSession, err := getQueue(ns, qrcvr.queueName, qrcvr.receiveMode, qrcvr.timeOut, qrcvr)
			if err != nil {
				logCache.Error(err.Error())
				return err
			}
			qrcvr.q = q
			qrcvr.isSession = isSession
			// Start polling on a separate Go routine so as to not block engine
			go qrcvr.listen()
		}
	}
	//log.Infof("Trigger - %s  started", t.config.Name)
	return nil
}

func getQueue(ns *servicebus.Namespace, queueName string, receiveMode string, timeout int, qrcv *QueueReceiver) (*servicebus.Queue, bool, error) {
	if timeout > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(timeout))
		defer cancel()
		qrcv.ctx = ctx
		qrcv.listenctxCancelFunc = cancel
	} else {
		qrcv.ctx = context.Background()

	}

	qm := ns.NewQueueManager()
	queList, err := qm.List(qrcv.ctx)
	if err != nil {
		return nil, false, err
	}
	queNotExist := true
	for _, entry := range queList {
		//	fmt.Println(idx, " ", entry.Name)
		if queueName == entry.Name {
			queNotExist = false
			break
		}
	}
	if queNotExist {
		return nil, false, errors.New("Could not find the specified Queue :" + queueName)
	}
	qe, err := qm.Get(qrcv.ctx, queueName)
	if err != nil {
		logCache.Error(err.Error())
		return nil, false, err
	}

	// if qe == nil {
	// 	_, err := qm.Put(ctx, queueName)
	// 	if err != nil {
	// 		log.Error(err.Error())
	// 		return nil, false, err
	// 	}
	// }
	isSession := *qe.QueueDescription.RequiresSession
	if receiveMode == "ReceiveAndDelete" {
		logCache.Debugf("Using receiveMode ReceiveAndDelete to create queue %s", queueName)
		q, err := ns.NewQueue(queueName, servicebus.QueueWithReceiveAndDelete())
		return q, isSession, err
	}
	logCache.Debugf("Using receiveMode PeekLock to create queue %s", queueName)
	q, err := ns.NewQueue(queueName)
	return q, isSession, err

}

func getDeadLetter(ns *servicebus.Namespace, queueName string, receiveMode string, qrcv *QueueReceiver) (*servicebus.DeadLetter, bool, error) {

	if qrcv.timeOut > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(qrcv.timeOut))
		defer cancel()
		qrcv.ctx = ctx
		qrcv.listenctxCancelFunc = cancel
	} else {
		qrcv.ctx = context.Background()

	}

	qm := ns.NewQueueManager()
	queList, err := qm.List(qrcv.ctx)
	if err != nil {
		return nil, false, err
	}
	queNotExist := true
	for _, entry := range queList {
		//	fmt.Println(idx, " ", entry.Name)
		if queueName == entry.Name {
			queNotExist = false
			break
		}
	}
	if queNotExist {
		return nil, false, errors.New("Could not find the specified Queue :" + queueName)
	}
	qe, err := qm.Get(qrcv.ctx, queueName)
	if err != nil {
		logCache.Error(err.Error())
		return nil, false, err
	}

	// if qe == nil {
	// 	_, err := qm.Put(ctx, queueName)
	// 	if err != nil {
	// 		log.Error(err.Error())
	// 		return nil, false, err
	// 	}
	// }
	isSession := *qe.QueueDescription.RequiresSession
	q, err := ns.NewQueue(queueName)
	if err != nil {
		logCache.Error(err.Error())
		return nil, false, err
	}
	defer func() {
		_ = q.Close(qrcv.ctx)
	}()

	qdl := q.NewDeadLetter()
	return qdl, isSession, err

}

func (qrcvr *QueueReceiver) listen() {

	ctx, cancel := context.WithCancel(context.Background())
	qrcvr.listenctxCancelFunc = cancel
	queueSession := &servicebus.QueueSession{}
	var err error

	if qrcvr.isSession {
		logCache.Infof("QueueReceiver will now poll on Queue [%s] which has session support", qrcvr.queueName)
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
		err = queueSession.ReceiveOne(ctx, ssh)
		if err != nil && qrcvr.count > 0 && qrcvr.interval > 0 {

			maxRetries := qrcvr.count

			for tries := 0; tries < maxRetries; tries++ {
				err = queueSession.ReceiveOne(ctx, ssh)
				if err != nil {
					sleepInterval := time.Duration(qrcvr.interval) * time.Millisecond
					fmt.Errorf("backend invocation error: %s", err.Error())
					time.Sleep(sleepInterval)
				}

			}

			logCache.Error(err.Error())
			return
		}

	} else {
		logCache.Infof("QueueReceiver will now poll on Queue [%s] which does not have session support", qrcvr.queueName)
		err = qrcvr.q.Receive(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
			err2 := processMessage(message, qrcvr.handler, qrcvr.valueType, qrcvr.queueName, false)
			if err2 == nil {
				return message.Complete(ctx)
			}
			return message.Abandon(ctx)
		}))
	}
	if err != nil && qrcvr.count > 0 && qrcvr.interval > 0 {

		maxRetries := qrcvr.count

		for tries := 0; tries < maxRetries; tries++ {
			err = qrcvr.q.Receive(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
				err2 := processMessage(message, qrcvr.handler, qrcvr.valueType, qrcvr.queueName, false)
				if err2 == nil {
					return message.Complete(ctx)
				}
				return message.Abandon(ctx)
			}))

			if err != nil {
				sleepInterval := time.Duration(qrcvr.interval) * time.Millisecond
				fmt.Errorf("backend invocation error: %s", err.Error())
				time.Sleep(sleepInterval)
			}

		}

		logCache.Error(err.Error())
		return
	}
	//logCache.Error(err.Error())
	//return

}

func (qrcvr *QueueReceiver) listenDeadletter() {

	ctx, cancel := context.WithCancel(context.Background())
	qrcvr.listenctxCancelFunc = cancel
	var err error

	logCache.Infof("Subscribing to DeadLetter  [%s]", qrcvr.queueName)

	for err == nil { //one more check needed here for checking cancel object

		err = qrcvr.deadLetter.ReceiveOne(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
			err2 := processMessage(message, qrcvr.handler, qrcvr.valueType, qrcvr.queueName, false)
			if err2 == nil {
				return message.Complete(ctx)
			}
			return message.Abandon(ctx)
		}))

	}

	if err != nil {
		logCache.Error(err.Error())
		return
	}

}

func processMessage(msg *servicebus.Message, handler trigger.Handler, valueType string, queueName string, isSession bool) error {
	// log.Infof("Processing record from Topic[%s], Partition[%d], Offset[%d]", msg.Topic, msg.Partition, msg.Offset)
	var outputRoot = map[string]interface{}{}
	var brokerProperties = map[string]interface{}{}
	outputData := make(map[string]interface{})
	output := &Output{}
	deserVal := valueType
	if deserVal == "String" {

		if msg.Data != nil {
			text := string(msg.Data)
			outputRoot["messageString"] = string(text)

		} else {
			outputRoot["messageString"] = string("") //blank   //need to remove, add warining
		}

		//put check here  msg.Data != nil  "" value
		brokerProperties["ContentType"] = msg.ContentType
		brokerProperties["CorrelationId"] = msg.CorrelationID
		//brokerPropertiesResp["DeliveryCount"] = msg.DeliveryCount
		brokerProperties["Label"] = msg.Label
		//brokerPropertiesResp["MessageId"] = msg.ID
		brokerProperties["PartitionKey"] = &msg.SystemProperties.PartitionKey
		brokerProperties["ReplyTo"] = msg.ReplyTo
		//	log.Info("isssession  ", isSession, " and sessionid ", *msg.SessionID)
		if isSession {
			brokerProperties["SessionId"] = *msg.SessionID
		}
		ttl := msg.TTL.String()
		ttlint, _ := strconv.Atoi(ttl)
		brokerProperties["TimeToLive"] = ttlint
		brokerProperties["To"] = msg.To
		//	log.Info("message received  data ", string(msg.Data), " sessionid ", msg.ID, " : ", *msg.SessionID)
		//brokerPropertiesResp["ViaPartitionKey"] = msg.SystemProperties.ViaPartitionKey

		//complexBrokerProperties := &data.ComplexObject{Metadata: "", Value: brokerProperties}
		//outputRoot["brokerProperties"] = complexBrokerProperties.Value

		outputRoot["brokerProperties"] = brokerProperties

		//outputComplex := &data.ComplexObject{Metadata: "", Value: outputRoot}
		//outputData["output"] = outputComplex

		outputData["output"] = outputRoot

		output.Output = outputData
		logCache.Debugf("Activity successfully executed") //changes logs
	} else if deserVal == "JSON" {
		// future use
	}
	//}

	_, err := handler.Handle(context.Background(), outputData)
	if err != nil {
		logCache.Errorf("Failed to process record from Queue [%s], due to error - %s", queueName, err.Error())
	} else {
		// record is successfully processed.
		logCache.Infof("Record from Queue [%s] is successfully processed", queueName)
	}
	return err
}

// Stop implements trigger.Trigger.Start
func (t *SBQueueReceiverTrigger) Stop() error {
	//logCache.Infof("Stopping Trigger - %s", t.config.Name)
	for _, qrcvr := range t.queueReceivers {
		logCache.Debugf("About to close ListenerHandler for Queue [%s]", qrcvr.queueName)
		select {
		case <-time.After(2 * time.Second):
			if qrcvr.isSession && !qrcvr.isDeadLetter {
				qrcvr.stepSessionHandler.messageSession.Close()
				qrcvr.listenctxCancelFunc()
			} else {
				qrcvr.listenctxCancelFunc()
				//qrcvr.q.Close(context.Background())
			}
		}
	}

	//logCache.Infof("Trigger - %s  stopped", t.config.Name)
	return nil
}
