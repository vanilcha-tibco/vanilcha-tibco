package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	servicebus "github.com/Azure/azure-service-bus-go"
)

// StepSessionHandler is a comment
type StepSessionHandler struct {
	messageSession *servicebus.MessageSession
}

// RecipeStep comment
type RecipeStep struct {
	Step  int    `json:"step,omitempty"`
	Title string `json:"title,omitempty"`
}

// Start is called when a new session is started
func (ssh *StepSessionHandler) Start(ms *servicebus.MessageSession) error {
	ssh.messageSession = ms
	fmt.Println("Begin session: ", *ssh.messageSession.SessionID())
	return nil
}

// Handle is called when a new session message is received
func (ssh *StepSessionHandler) Handle(ctx context.Context, msg *servicebus.Message) error {
	var step RecipeStep
	if err := json.Unmarshal(msg.Data, &step); err != nil {
		fmt.Println(err)
		return err
	}

	fmt.Printf("  Step: %d, %s\n", step.Step, step.Title)

	if step.Step == 5 {
		ssh.messageSession.Close()
	}
	return msg.Complete(ctx)
}

// End is called when the message session is closed. Service Bus will not automatically end your message session. Be
// sure to know when to terminate your own session.
func (ssh *StepSessionHandler) End() {
	fmt.Println("End session: ", *ssh.messageSession.SessionID())
	fmt.Println("")
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	defer cancel()

	//connStr := os.Getenv("SERVICEBUS_CONNECTION_STRING")
	connStr := "Endpoint=sb://tibcojetblueexp.servicebus.windows.net/;SharedAccessKeyName=golangtest;SharedAccessKey=vhMKaTQec0YkqLG5963xz8QEezJKpQ+unBxquWG9qMY="
	if connStr == "" {
		fmt.Println("FATAL: expected environment variable SERVICEBUS_CONNECTION_STRING not set")
		return
	}

	// Create a client to communicate with a Service Bus Namespace.
	ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(connStr))
	if err != nil {
		fmt.Println(err)
		return
	}
	tm := ns.NewTopicManager()

	tEntity, err := ensureTopic(ctx, tm, "jbtopic1", servicebus.TopicWithOrdering())
	if err != nil {
		fmt.Println(err)
		return
	}

	t, err := ns.NewTopic(tEntity.Name)
	if err != nil {
		fmt.Println(err)
		return
	}

	subscriptionName := "subs"
	s, err := getSubscription(ns, "sub", t)
	if err != nil {
		fmt.Printf("failed to build a new subscription named %q\n", subscriptionName)
		fmt.Printf("error %s\n", err)
		os.Exit(1)
	}

	//sessions := []string{"foo", "bar", "bazz", "buzz"}
	sessions := []string{"foo"}
	for _, session := range sessions {
		ss := s.NewSession(&session)

		err := ss.ReceiveOne(ctx, new(StepSessionHandler))
		if err != nil {
			fmt.Println(err)
			return
		}

		if err := ss.Close(ctx); err != nil {
			fmt.Println(err)
			return
		}
	}
}

func ensureTopic(ctx context.Context, tm *servicebus.TopicManager, name string, opts ...servicebus.TopicManagementOption) (*servicebus.TopicEntity, error) {
	te, err := tm.Get(ctx, name)
	if err == nil {
		fmt.Println("Topic with name jbtopic1 exists")
	}

	if err != nil {
		te, err = tm.Put(ctx, name, opts...)
		if err != nil {
			fmt.Println(err)
			return nil, err
		}
	}

	return te, nil
}

func getSubscription(ns *servicebus.Namespace, subscriptionName string, topic *servicebus.Topic) (*servicebus.Subscription, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	sm := topic.NewSubscriptionManager()
	se, err := sm.Get(ctx, subscriptionName)
	if err != nil {
		//return nil, err
	}

	if se == nil {
		fmt.Println("Subscription with name subs not found. Creating one...")
		_, err = sm.Put(ctx, subscriptionName, servicebus.SubscriptionWithRequiredSessions())
		if err != nil {
			return nil, err
		}
	}

	subscription, err := topic.NewSubscription(subscriptionName)
	return subscription, err
}
