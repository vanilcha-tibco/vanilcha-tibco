package topicsubscriber

import (
	"context"
	"errors"
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
	return &SBTopicSubscriberTrigger{metadata: t.metadata, config: config}
}

var log = logger.GetLogger("AzureServiceBus-trigger-topicsubscriber")

// SBTopicSubscriberTrigger is a stub for your Trigger implementation
type SBTopicSubscriberTrigger struct {
	metadata         *trigger.Metadata
	config           *trigger.Config
	topicSubscribers []*TopicSubscriber
}

// TopicSubscriber is structure of a single TopicSubscriber
type TopicSubscriber struct {
	handler             *trigger.Handler
	topic               *servicebus.Topic
	stepSessionHandler  *StepSessionHandler
	subscription        *servicebus.Subscription
	listenctxCancelFunc context.CancelFunc
	topicName           string
	subscriptionName    string
	sessionID           string
	connString          string
	valueType           string
	done                chan bool
	isSession           bool
}

// StepSessionHandler is a comment
type StepSessionHandler struct {
	messageSession   *servicebus.MessageSession
	valueType        string
	topicName        string
	subscriptionName string
	handler          *trigger.Handler
}

// Start is called when a new session is started
func (ssh *StepSessionHandler) Start(ms *servicebus.MessageSession) error {
	ssh.messageSession = ms
	if ssh.messageSession.SessionID() != nil {
		log.Infof("Begin session: %s", *ssh.messageSession.SessionID())
	} else {
		log.Infof("Begin listening to all sessions for the subscription: %s", ssh.subscriptionName)
	}

	return nil
}

// Handle is called when a new session message is received
func (ssh *StepSessionHandler) Handle(ctx context.Context, msg *servicebus.Message) error {
	err2 := processMessage(msg, ssh.handler, ssh.valueType, ssh.topicName, ssh.subscriptionName, true)
	if err2 == nil {
		return msg.Complete(ctx)
	}
	return msg.Abandon(ctx)
}

// End is called when the message session is closed. Service Bus will not automatically end your message session. Be
// sure to know when to terminate your own session.
func (ssh *StepSessionHandler) End() {
	if ssh.messageSession.SessionID() != nil {
		log.Infof("Ending session: %s", *ssh.messageSession.SessionID())
	} else {
		log.Infof("Ending session handler for all sessions ")
	}
}

// Initialize SBTopicSubscriberTrigger
func (t *SBTopicSubscriberTrigger) Initialize(ctx trigger.InitContext) error {

	config, err := azservicebus.BuildConfigurationFromConnection(t.config.Settings["azservicebusConnection"])
	if err != nil {
		return fmt.Errorf("Failed to load Azure Service Bus connection configuration. %s", err.Error())
	}

	for _, handler := range ctx.GetHandlers() {

		topicName := handler.GetStringSetting("topic")
		subscriptionName := handler.GetStringSetting("subscriptionName")
		sessionID := handler.GetStringSetting("sessionId")
		valueType := handler.GetStringSetting("valueType")
		//handler.
		connStr := "Endpoint=sb://" + config.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + config.AuthorizationRuleName + ";SharedAccessKey=" + config.PrimarysecondaryKey
		trcvr := &TopicSubscriber{}
		trcvr.handler = handler
		trcvr.connString = connStr
		trcvr.topicName = topicName
		trcvr.subscriptionName = subscriptionName
		trcvr.valueType = valueType
		trcvr.sessionID = sessionID
		trcvr.done = make(chan bool)
		t.topicSubscribers = append(t.topicSubscribers, trcvr)
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
func (t *SBTopicSubscriberTrigger) Metadata() *trigger.Metadata {
	return t.metadata
}

// Start implements trigger.Trigger.Start
func (t *SBTopicSubscriberTrigger) Start() error {

	log.Infof("Starting Trigger - %s", t.config.Name)

	for _, trcvr := range t.topicSubscribers {

		ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(trcvr.connString))
		if err != nil {
			log.Error(err.Error())
			return err
		}
		topic, err := getTopic(ns, trcvr.topicName)
		if err != nil {
			log.Error(err.Error())
			return err
		}
		subsc, isSession, err := getSubscription(ns, trcvr.subscriptionName, topic)
		if err != nil {
			log.Error("Failed to build a new subscription named %s due to error: %s", trcvr.subscriptionName, err.Error())
			return err
		}
		trcvr.topic = topic
		trcvr.subscription = subsc
		trcvr.isSession = isSession
		// Start subscribing on a separate Go routine so as to not block engine
		go trcvr.subscribe()
	}
	return nil
}

func getTopic(ns *servicebus.Namespace, topicName string) (*servicebus.Topic, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	tm := ns.NewTopicManager()
	topicList, err := tm.List(ctx)
	topicNotExist := true
	for _, entry := range topicList {
		//	fmt.Println(idx, " ", entry.Name)
		if topicName == entry.Name {
			topicNotExist = false
			break
		}
	}
	if topicNotExist {
		return nil, errors.New("Could not find the specified Topic")
	}
	te, err := tm.Get(ctx, topicName)
	if err != nil {
		return nil, err
	}

	if te == nil {
		return nil, fmt.Errorf("Topic with name %s not found on Namespace %s", topicName, ns.Name)
	}
	topic, err := ns.NewTopic(topicName)
	return topic, err
}

func getSubscription(ns *servicebus.Namespace, subscriptionName string, topicName *servicebus.Topic) (*servicebus.Subscription, bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	//ctx, cancel := context.Background()
	defer cancel()

	sm, err := ns.NewSubscriptionManager(topicName.Name)
	se, err := sm.Get(ctx, subscriptionName)
	if err != nil {
		return nil, false, err
	}

	// If subscription does not exist with that name, create one with default subscription rules and options
	// if se == nil {
	// 	_, err := sm.Put(ctx, subscriptionName)
	// 	if err != nil {
	// 		return nil, false, err
	// 	}
	// }
	isSession := *se.SubscriptionDescription.RequiresSession
	subscription, err := topicName.NewSubscription(subscriptionName)
	return subscription, isSession, err
}

func (trcvr *TopicSubscriber) subscribe() {
	ctx, cancel := context.WithCancel(context.Background())
	trcvr.listenctxCancelFunc = cancel
	ss := &servicebus.SubscriptionSession{}
	var err error
	if trcvr.isSession {
		log.Infof("TopicSubscriber will now poll on subscription [%s] which has session support for topic [%s]", trcvr.subscriptionName, trcvr.topicName)
		if trcvr.sessionID != "" {
			ss = trcvr.subscription.NewSession(&trcvr.sessionID)
		} else {
			ss = trcvr.subscription.NewSession(nil)
		}
		ssh := &StepSessionHandler{}
		ssh.valueType = trcvr.valueType
		ssh.handler = trcvr.handler
		ssh.topicName = trcvr.topicName
		ssh.subscriptionName = trcvr.subscriptionName

		trcvr.stepSessionHandler = ssh
		err = ss.ReceiveOne(ctx, ssh)
	} else {
		log.Infof("TopicSubscriber will now poll on subscription [%s] which does not have session support for topic [%s]", trcvr.subscriptionName, trcvr.topicName)
		err = trcvr.subscription.Receive(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
			err2 := processMessage(message, trcvr.handler, trcvr.valueType, trcvr.topicName, trcvr.subscriptionName, false)
			if err2 == nil {
				return message.Complete(ctx)
			}
			return message.Abandon(ctx)
		}))
	}

	if err != nil {
		log.Error(err.Error())
		return
	}

	log.Infof("TopicSubscriber is now subscribed to Topic [%s] with Subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
	/*select {
	case <-trcvr.done:
		log.Infof("Subscription to Topic [%s] is stopped as the Trigger was stopped ", trcvr.topicName)
		return
	}*/
}

func processMessage(msg *servicebus.Message, handler *trigger.Handler, valueType string, topicName string, subscriptionName string, isSession bool) error {
	var outputRoot = map[string]interface{}{}
	var brokerProperties = map[string]interface{}{}
	outputData := make(map[string]interface{})

	if msg.Data != nil {
		//deserVal := trcvr.valueType
		if valueType == "String" {
			text := string(msg.Data)
			outputRoot["messageString"] = string(text)
			brokerProperties["ContentType"] = msg.ContentType
			brokerProperties["CorrelationId"] = msg.CorrelationID
			//brokerPropertiesResp["DeliveryCount"] = msg.DeliveryCount
			brokerProperties["Label"] = msg.Label
			//brokerPropertiesResp["MessageId"] = msg.ID
			brokerProperties["PartitionKey"] = &msg.SystemProperties.PartitionKey
			brokerProperties["ReplyTo"] = msg.ReplyTo
			if isSession {
				brokerProperties["SessionId"] = *msg.SessionID
			}
			ttl := msg.TTL.String()
			ttlint, _ := strconv.Atoi(ttl)
			brokerProperties["TimeToLive"] = ttlint
			brokerProperties["To"] = msg.To
			//brokerPropertiesResp["ViaPartitionKey"] = msg.SystemProperties.ViaPartitionKey
			//	log.Info("message received  data ", string(msg.Data), " sessionid ", msg.ID, " : ", *msg.SessionID)
			complexBrokerProperties := &data.ComplexObject{Metadata: "", Value: brokerProperties}
			outputRoot["brokerProperties"] = complexBrokerProperties.Value

			outputComplex := &data.ComplexObject{Metadata: "", Value: outputRoot}
			outputData["output"] = outputComplex
		} else if valueType == "JSON" {
			// future use
		}
	}

	_, err := handler.Handle(context.Background(), outputData)
	if err != nil {
		log.Errorf("Failed to process record from Topic [%s], due to error - %s", topicName, err.Error())
	} else {
		// record is successfully processed.
		log.Infof("Record from Topic [%s] for subscription [%s] is successfully processed", topicName, subscriptionName)
	}
	return err
}

// Stop implements trigger.Trigger.Start
func (t *SBTopicSubscriberTrigger) Stop() error {
	log.Infof("Stopping Trigger - %s", t.config.Name)
	for _, trcvr := range t.topicSubscribers {
		log.Debugf("About to close ListenerHandler for Topic [%s] and it's subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
		select {
		case <-time.After(2 * time.Second):
			//	trcvr.stepSessionHandler.messageSession.Close()
			if trcvr.isSession {
				trcvr.stepSessionHandler.messageSession.Close()
				trcvr.listenctxCancelFunc()
			} else {
				trcvr.listenctxCancelFunc()
				//qrcvr.q.Close(context.Background())
			}

		}
	}

	log.Infof("Trigger - %s  stopped", t.config.Name)
	return nil
}
