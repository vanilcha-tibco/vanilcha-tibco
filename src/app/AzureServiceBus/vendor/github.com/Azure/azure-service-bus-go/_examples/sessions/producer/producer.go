package main

import (
	"context"
	"fmt"
	"time"

	"encoding/json"

	"github.com/Azure/azure-service-bus-go"
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

	// Create a Service Bus Queue with required sessions enabled. This will ensure that all messages sent and received
	// are bound to a session.
	qm := ns.NewQueueManager()
	//qEntity, err := ensureQueue(ctx, qm, "queue3", servicebus.QueueEntityWithRequiredSessions())
	qEntity, err := ensureQueue(ctx, qm, "jbqueue3")
	if err != nil {
		fmt.Println(err)
		return
	}

	q, err := ns.NewQueue(qEntity.Name)
	if err != nil {
		fmt.Println(err)
		return
	}

	//sessions := []string{"foo", "bar", "bazz", "buzz"}
	sessions := []string{"session2"}
	for _, session := range sessions {
		// send recipe steps
		// note that order is preserved within a given session
		sendSessionRecipeSteps(ctx, session, q)
	}
}

func sendSessionRecipeSteps(ctx context.Context, sessionID string, q *servicebus.Queue) {
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
		fmt.Println("About to send...")
		if err := q.Send(ctx, msg); err != nil {
			fmt.Println(err)
			return
		}
		fmt.Println("sent successfully")
	}
}

func ensureQueue(ctx context.Context, qm *servicebus.QueueManager, name string, opts ...servicebus.QueueManagementOption) (*servicebus.QueueEntity, error) {
	qe, err := qm.Get(ctx, name)
	if err == nil {
		//_ = qm.Delete(ctx, name)
	}

	if err != nil {
		qe, err = qm.Put(ctx, name, opts...)
		if err != nil {
			fmt.Println(err)
			return nil, err
		}
	}

	return qe, nil
}
