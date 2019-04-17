package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	servicebus "github.com/Azure/azure-service-bus-go"
)

// RecipeStep comment
type RecipeStep struct {
	Step  int    `json:"step,omitempty"`
	Title string `json:"title,omitempty"`
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
	tEntity, err := ensureTopic(ctx, tm, "topic1", servicebus.TopicWithOrdering())
	if err != nil {
		fmt.Println(err)
		return
	}

	t, err := ns.NewTopic(tEntity.Name)
	if err != nil {
		fmt.Println(err)
		return
	}

	//sessions := []string{"foo", "bar", "bazz", "buzz"}
	sessions := []string{"bar", "foo"}
	for _, session := range sessions {
		// send recipe steps
		// note that order is preserved within a given session
		sendSessionRecipeSteps(ctx, session, t)
	}
}

func ensureTopic(ctx context.Context, tm *servicebus.TopicManager, name string, opts ...servicebus.TopicManagementOption) (*servicebus.TopicEntity, error) {
	te, err := tm.Get(ctx, name)
	if err == nil {
		fmt.Println("Topic with name topic1 exists")
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
func sendSessionRecipeSteps(ctx context.Context, sessionID string, t *servicebus.Topic) {
	steps := []RecipeStep{
		{
			Step:  1,
			Title: "Shop",
		},
		{
			Step:  2,
			Title: "Unpack",
		},
		{
			Step:  3,
			Title: "Prepare",
		},
		{
			Step:  4,
			Title: "Cook",
		},
		{
			Step:  5,
			Title: "Eat",
		},
	}

	for _, step := range steps {
		bits, err := json.Marshal(step)
		if err != nil {
			fmt.Println(err)
			return
		}

		msg := servicebus.NewMessage(bits)
		msg.ContentType = "application/json"
		msg.SessionID = &sessionID
		if err := t.Send(ctx, msg); err != nil {
			fmt.Println(err)
			return
		}
	}
}
