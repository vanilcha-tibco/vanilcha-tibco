package main

import (
	"context"
	"fmt"
	"os"
	"time"

	servicebus "github.com/Azure/azure-service-bus-go"
)

func main() {
	connStr := "Endpoint=sb://spaddindev.servicebus.windows.net/;SharedAccessKeyName=PluginServiceBus;SharedAccessKey=wPdI5Lk/Dh8b3GT8Z3R4pIb/7mCTBlr8CQ9gaSBVvFg="
	//connStr := mustGetenv(connstring)
	ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(connStr))
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	topicName := "test1"
	subscriptionName := "helloworldsubscriptionzzz"
	t, err := getTopic(ns, topicName)
	if err != nil {
		fmt.Printf("failed to build a new topic named %q\n", topicName)
		fmt.Printf("error %s\n", err)
		os.Exit(1)
	}
	s, err := getSubscription(ns, subscriptionName, t)
	if err != nil {
		fmt.Printf("failed to build a new subscription named %q\n", subscriptionName)
		fmt.Printf("error %s\n", err)
		os.Exit(1)
	}

	exit := make(chan struct{})
	ctx1, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	fmt.Println("Setting up listener for Subscriptinon...", subscriptionName)
	listenHandlesub, err := s.Receive(ctx1, func(ctx context.Context, message *servicebus.Message) servicebus.DispositionAction {
		//message.
		text := string(message.Data)
		if text == "exit\n" {
			fmt.Println("Oh snap!! Someone told me to exit!")
			exit <- *new(struct{})
		} else {
			fmt.Println(string(message.Data))
		}
		return message.Complete()
	})
	defer listenHandlesub.Close(context.Background())

	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	fmt.Println("I am listening...", subscriptionName)

	select {
	case <-exit:
		fmt.Println("closing after 2 seconds")
		select {
		case <-time.After(2 * time.Second):
			listenHandlesub.Close(context.Background())
			return
		}
	}
}
func getTopic(ns *servicebus.Namespace, topicName string) (*servicebus.Topic, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	qm := ns.NewTopicManager()
	qe, err := qm.Get(ctx, topicName)
	if err != nil {
		return nil, err
	}

	if qe == nil {
		_, err := qm.Put(ctx, topicName)
		if err != nil {
			return nil, err
		}
	}

	q, err := ns.NewTopic(ctx, topicName)
	return q, err
}
func getSubscription(ns *servicebus.Namespace, subscriptionName string, topicName *servicebus.Topic) (*servicebus.Subscription, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	qm, err := ns.NewSubscriptionManager(ctx, topicName.Name)
	qe, err := qm.Get(ctx, subscriptionName)
	if err != nil {
		return nil, err
	}

	if qe == nil {
		_, err := qm.Put(ctx, subscriptionName)
		if err != nil {
			return nil, err
		}
	}

	q, err := topicName.NewSubscription(ctx, subscriptionName)
	return q, err
}
