package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"time"

	"github.com/Azure/azure-service-bus-go"
)

func main() {
	// Connect
	connStr := "Endpoint=sb://spaddindev.servicebus.windows.net/;SharedAccessKeyName=PluginServiceBus;SharedAccessKey=wPdI5Lk/Dh8b3GT8Z3R4pIb/7mCTBlr8CQ9gaSBVvFg="
	ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(connStr))
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	//queueName := "helloworld"
	topicName := "helloworldtopic"
	q, err := getTopic(ns, topicName)
	if err != nil {
		fmt.Printf("failed to build a new queue named %q\n", topicName)
		os.Exit(1)
	}

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("Enter text: ")
		text, _ := reader.ReadString('\n')
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		q.Send(ctx, servicebus.NewMessageFromString(text))
		if text == "exit\n" {
			cancel()
			break
		}
		cancel()
	}
}

func getQueue(ns *servicebus.Namespace, queueName string) (*servicebus.Queue, error) {
	q, err := ns.NewQueue(queueName)
	return q, err
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
func mustGetenv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic("Environment variable '" + key + "' required for integration tests.")
	}
	return v
}
