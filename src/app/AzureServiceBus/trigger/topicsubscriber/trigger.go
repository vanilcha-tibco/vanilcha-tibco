package topicsubscriber

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

//OSS UPGRADE---
var logCache = log.ChildLogger(log.RootLogger(), "AzureServiceBus-trigger-topicsubscriber")

var triggerMd = trigger.NewMetadata(&HandlerSettings{}, &Output{})

func init() {
	_ = trigger.Register(&SBTopicSubscriberTrigger{}, &MyTriggerFactory{})
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
	return &SBTopicSubscriberTrigger{metadata: t.metadata, config: config}, nil
}

// Metadata implements trigger.Factory.Metadata
func (*MyTriggerFactory) Metadata() *trigger.Metadata {
	return triggerMd
}

// SBTopicSubscriberTrigger is a stub for your Trigger implementation
type SBTopicSubscriberTrigger struct {
	metadata         *trigger.Metadata
	config           *trigger.Config
	topicSubscribers []*TopicSubscriber
}

// TopicSubscriber is structure of a single TopicSubscriber
type TopicSubscriber struct {
	handler             trigger.Handler
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
	deadLetter          *servicebus.DeadLetter
	isDeadLetter        bool
	timeOut             int
	ctx                 context.Context
}

// StepSessionHandler is a comment
type StepSessionHandler struct {
	messageSession   *servicebus.MessageSession
	valueType        string
	topicName        string
	subscriptionName string
	handler          trigger.Handler
}

// Start is called when a new session is started
func (ssh *StepSessionHandler) Start(ms *servicebus.MessageSession) error {
	ssh.messageSession = ms
	if ssh.messageSession.SessionID() != nil {
		logCache.Infof("Begin session: %s", *ssh.messageSession.SessionID())
	} else {
		logCache.Infof("Begin listening to all sessions for the subscription: %s", ssh.subscriptionName)
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
		logCache.Infof("Ending session: %s", *ssh.messageSession.SessionID())
	} else {
		logCache.Infof("Ending session handler for all sessions ")
	}
}

// Initialize SBTopicSubscriberTrigger
func (t *SBTopicSubscriberTrigger) Initialize(ctx trigger.InitContext) error {

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
		//fmt.Errorf("ERROR")
		//}
		//fmt.Println(string(b))

		handlerSettings.Connection, err = azureservicebusconnection.GetSharedConfiguration(handler.Settings()["azservicebusConnection"])
		if err != nil {
			return err
		}

		asbscm, _ := handlerSettings.Connection.(*azureservicebusconnection.AzureServiceBusSharedConfigManager)

		topicName := handlerSettings.Topic
		subscriptionName := handlerSettings.SubscriptionName
		sessionID := handlerSettings.SessionId
		valueType := handlerSettings.ValueType
		//handler.
		connStr := "Endpoint=sb://" + asbscm.AzureToken.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + asbscm.AzureToken.AuthorizationRuleName + ";SharedAccessKey=" + asbscm.AzureToken.PrimarysecondaryKey
		trcvr := &TopicSubscriber{}
		trcvr.handler = handler
		trcvr.connString = connStr
		trcvr.topicName = topicName
		trcvr.subscriptionName = subscriptionName
		trcvr.valueType = valueType
		trcvr.sessionID = sessionID
		trcvr.done = make(chan bool)
		trcvr.isDeadLetter = handlerSettings.DeadLetter
		trcvr.timeOut = handlerSettings.Timeout
		t.topicSubscribers = append(t.topicSubscribers, trcvr)
	}

	return nil
}

// Start implements trigger.Trigger.Start
func (t *SBTopicSubscriberTrigger) Start() error {

	//log.Infof("Starting Trigger - %s", t.config.Name)

	for _, trcvr := range t.topicSubscribers {

		ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(trcvr.connString))
		if err != nil {
			logCache.Error(err.Error())
			return err
		}
		topic, err := getTopic(ns, trcvr.topicName, trcvr)
		if err != nil {
			logCache.Error(err.Error())
			return err
		}

		if trcvr.isDeadLetter {
			dlsubsc, isSession, err := getDeadLetterSubscription(ns, trcvr.subscriptionName, topic, trcvr)
			if err != nil {
				logCache.Error("Failed to build a new subscription named %s due to error: %s", trcvr.subscriptionName, err.Error())
				return err
			}

			trcvr.topic = topic
			trcvr.deadLetter = dlsubsc
			trcvr.isSession = isSession
			// Start subscribing on a separate Go routine so as to not block engine
			go trcvr.subscribeDeadletter()

		} else {
			subsc, isSession, err := getSubscription(ns, trcvr.subscriptionName, topic, trcvr)
			if err != nil {
				logCache.Error("Failed to build a new subscription named %s due to error: %s", trcvr.subscriptionName, err.Error())
				return err
			}
			trcvr.topic = topic
			trcvr.subscription = subsc
			trcvr.isSession = isSession
			// Start subscribing on a separate Go routine so as to not block engine
			go trcvr.subscribe()

		}

	}
	return nil
}

func getTopic(ns *servicebus.Namespace, topicName string, trcvr *TopicSubscriber) (*servicebus.Topic, error) {
	if trcvr.timeOut > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(trcvr.timeOut))
		defer cancel()
		trcvr.ctx = ctx
		trcvr.listenctxCancelFunc = cancel
	} else {
		trcvr.ctx = context.Background()

	}

	tm := ns.NewTopicManager()
	topicList, err := tm.List(trcvr.ctx)
	if err != nil {
		return nil, err
	}
	topicNotExist := true
	for _, entry := range topicList {
		//	fmt.Println(idx, " ", entry.Name)

		if topicName == entry.Name {
			topicNotExist = false
			break
		}
	}
	if topicNotExist {
		return nil, errors.New("Could not find the specified Topic :" + topicName)
	}
	te, err := tm.Get(trcvr.ctx, topicName)
	if err != nil {
		return nil, err
	}

	if te == nil {
		return nil, fmt.Errorf("Topic with name %s not found on Namespace %s", topicName, ns.Name)
	}
	topic, err := ns.NewTopic(topicName)
	return topic, err
}

func getSubscription(ns *servicebus.Namespace, subscriptionName string, topicName *servicebus.Topic, trcvr *TopicSubscriber) (*servicebus.Subscription, bool, error) {
	if trcvr.timeOut > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(trcvr.timeOut))
		defer cancel()
		trcvr.ctx = ctx
		trcvr.listenctxCancelFunc = cancel
	} else {
		trcvr.ctx = context.Background()

	}

	sm, err := ns.NewSubscriptionManager(topicName.Name)
	se, err := sm.Get(trcvr.ctx, subscriptionName)
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

func getDeadLetterSubscription(ns *servicebus.Namespace, subscriptionName string, topicName *servicebus.Topic, trcvr *TopicSubscriber) (*servicebus.DeadLetter, bool, error) {
	if trcvr.timeOut > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(trcvr.timeOut))
		defer cancel()
		trcvr.ctx = ctx
		trcvr.listenctxCancelFunc = cancel
	} else {
		trcvr.ctx = context.Background()

	}

	sm, err := ns.NewSubscriptionManager(topicName.Name)
	se, err := sm.Get(trcvr.ctx, subscriptionName)
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

	sdl := subscription.NewDeadLetter()

	return sdl, isSession, err

}

func (trcvr *TopicSubscriber) subscribe() {
	ctx, cancel := context.WithCancel(context.Background())
	trcvr.listenctxCancelFunc = cancel
	ss := &servicebus.SubscriptionSession{}
	var err error
	if trcvr.isSession {
		logCache.Infof("TopicSubscriber will now poll on subscription [%s] which has session support for topic [%s]", trcvr.subscriptionName, trcvr.topicName)
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
		logCache.Infof("TopicSubscriber will now poll on subscription [%s] which does not have session support for topic [%s]", trcvr.subscriptionName, trcvr.topicName)
		err = trcvr.subscription.Receive(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
			err2 := processMessage(message, trcvr.handler, trcvr.valueType, trcvr.topicName, trcvr.subscriptionName, false)
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

	logCache.Infof("TopicSubscriber is now subscribed to Topic [%s] with Subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
	/*select {
	case <-trcvr.done:
		log.Infof("Subscription to Topic [%s] is stopped as the Trigger was stopped ", trcvr.topicName)
		return
	}*/
}

func (trcvr *TopicSubscriber) subscribeDeadletter() {

	ctx, cancel := context.WithCancel(context.Background())
	trcvr.listenctxCancelFunc = cancel
	//queueSession := &servicebus.QueueSession{}
	var err error

	logCache.Infof("DeadLetter Subscription for Topic [%s] with Subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
	for err == nil {
		err = trcvr.deadLetter.ReceiveOne(ctx, servicebus.HandlerFunc(func(ctx context.Context, message *servicebus.Message) error {
			err2 := processMessage(message, trcvr.handler, trcvr.valueType, trcvr.topicName, trcvr.subscriptionName, false)
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

func processMessage(msg *servicebus.Message, handler trigger.Handler, valueType string, topicName string, subscriptionName string, isSession bool) error {
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
			//complexBrokerProperties := &data.ComplexObject{Metadata: "", Value: brokerProperties}
			//outputRoot["brokerProperties"] = complexBrokerProperties.Value

			outputRoot["brokerProperties"] = brokerProperties

			//outputComplex := &data.ComplexObject{Metadata: "", Value: outputRoot}
			//outputData["output"] = outputComplex
			outputData["output"] = outputRoot
		} else if valueType == "JSON" {
			// future use
		}
	}

	_, err := handler.Handle(context.Background(), outputData)
	if err != nil {
		logCache.Errorf("Failed to process record from Topic [%s], due to error - %s", topicName, err.Error())
	} else {
		// record is successfully processed.
		logCache.Infof("Record from Topic [%s] for subscription [%s] is successfully processed", topicName, subscriptionName)
	}
	return err
}

// Stop implements trigger.Trigger.Start
func (t *SBTopicSubscriberTrigger) Stop() error {
	//log.Infof("Stopping Trigger - %s", t.config.Name)
	for _, trcvr := range t.topicSubscribers {
		logCache.Debugf("About to close ListenerHandler for Topic [%s] and it's subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
		select {
		case <-time.After(2 * time.Second):
			//	trcvr.stepSessionHandler.messageSession.Close()
			if trcvr.isSession && !trcvr.isDeadLetter {
				trcvr.stepSessionHandler.messageSession.Close()
				trcvr.listenctxCancelFunc()
			} else {
				trcvr.listenctxCancelFunc()
				//qrcvr.q.Close(context.Background())
			}

		}
	}

	//log.Infof("Trigger - %s  stopped", t.config.Name)
	return nil
}
