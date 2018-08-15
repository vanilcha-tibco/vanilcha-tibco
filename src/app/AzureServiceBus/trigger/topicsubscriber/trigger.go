package topicsubscriber

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
	listenerHandler     *servicebus.ListenerHandle
	subscription        *servicebus.Subscription
	listenctxCancelFunc context.CancelFunc
	topicName           string
	subscriptionName    string
	connString          string
	valueType           string
	done                chan bool
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
		valueType := handler.GetStringSetting("valueType")
		connStr := "Endpoint=sb://" + config.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + config.AuthorizationRuleName + ";SharedAccessKey=" + config.PrimarysecondaryKey
		trcvr := &TopicSubscriber{}
		trcvr.handler = handler
		trcvr.connString = connStr
		trcvr.topicName = topicName
		trcvr.subscriptionName = subscriptionName
		trcvr.valueType = valueType
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
		subsc, err := getSubscription(ns, trcvr.subscriptionName, topic)
		if err != nil {
			log.Error("Failed to build a new subscription named %s due to error: %s", trcvr.subscriptionName, err.Error())
			return err
		}
		trcvr.topic = topic
		trcvr.subscription = subsc
		// Start subscribing on a separate Go routine so as to not block engine
		go trcvr.subscribe()
	}
	log.Infof("Trigger - %s  started", t.config.Name)
	return nil
}

func getTopic(ns *servicebus.Namespace, topicName string) (*servicebus.Topic, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	tm := ns.NewTopicManager()
	te, err := tm.Get(ctx, topicName)
	if err != nil {
		return nil, err
	}

	if te == nil {
		return nil, fmt.Errorf("Topic with name %s not found on Namespace %s", topicName, ns.Name)
	}
	topic, err := ns.NewTopic(ctx, topicName)
	return topic, err
}

func getSubscription(ns *servicebus.Namespace, subscriptionName string, topicName *servicebus.Topic) (*servicebus.Subscription, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	sm, err := ns.NewSubscriptionManager(ctx, topicName.Name)
	se, err := sm.Get(ctx, subscriptionName)
	if err != nil {
		return nil, err
	}

	// If subscription does not exist with that name, create one with default subscription rules and options
	if se == nil {
		_, err := sm.Put(ctx, subscriptionName)
		if err != nil {
			return nil, err
		}
	}

	subscription, err := topicName.NewSubscription(ctx, subscriptionName)
	return subscription, err
}

func (trcvr *TopicSubscriber) subscribe() {
	//fmt.Println("Setting up subscriber...")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	trcvr.listenctxCancelFunc = cancel
	//defer cancel()
	listenHandlesub, err := trcvr.subscription.Receive(ctx, func(ctx context.Context, message *servicebus.Message) servicebus.DispositionAction {
		err2 := trcvr.processMessage(message)
		if err2 == nil {
			return message.Complete()
		}
		return message.Abandon()
	})
	trcvr.listenerHandler = listenHandlesub
	//defer listenHandlesub.Close(context.Background())
	if err != nil {
		log.Error(err.Error())
		return
	}

	//fmt.Println("I am listening...")
	log.Infof("TopicSubscriber is now subscribed to Topic [%s] with Subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
	select {
	case <-trcvr.done:
		log.Debugf("Subscription to Topic [%s] is stopped as the Trigger was stopped ", trcvr.topicName)
		return
	}

}

func (trcvr *TopicSubscriber) processMessage(msg *servicebus.Message) error {
	// log.Infof("Processing record from Topic[%s], Partition[%d], Offset[%d]", msg.Topic, msg.Partition, msg.Offset)
	var outputRoot = map[string]interface{}{}
	var brokerProperties = map[string]interface{}{}
	outputData := make(map[string]interface{})

	if msg.Data != nil {
		deserVal := trcvr.valueType
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

	_, err := trcvr.handler.Handle(context.Background(), outputData)
	if err != nil {
		log.Errorf("Failed to process record from Topic [%s], due to error - %s", trcvr.topicName, err.Error())
	} else {
		// record is successfully processed.
		log.Infof("Record from Topic [%s] for subscription [%s] is successfully processed", trcvr.topicName, trcvr.subscriptionName)
	}
	return err
}

// Stop implements trigger.Trigger.Start
func (t *SBTopicSubscriberTrigger) Stop() error {
	log.Infof("Stopping Trigger - %s", t.config.Name)
	for _, trcvr := range t.topicSubscribers {
		// Stop polling
		trcvr.done <- true
		//fmt.Println("closing after 2 seconds")
		log.Debugf("About to close ListenerHandler for Topic [%s] and it's subscription [%s]", trcvr.topicName, trcvr.subscriptionName)
		select {
		case <-time.After(2 * time.Second):
			trcvr.listenerHandler.Close(context.Background())
		}
		trcvr.listenctxCancelFunc()
	}

	log.Infof("Trigger - %s  stopped", t.config.Name)
	return nil
}
