package main

import (
	"context"
	"fmt"

	"encoding/json"

	"github.com/Azure/azure-service-bus-go"
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

	//ctx, cancel := context.WithTimeout(context.Background(), 40*time.Second)
	ctx, cancel := context.WithCancel(context.Background())
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
	qEntity, err := ensureQueue(ctx, qm, "jbqueue3", servicebus.QueueEntityWithRequiredSessions())
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
	sessions := []string{"buzz"}
	for _, session := range sessions {
		queueSession := q.NewSession(&session)
		//queueSession.
		err := queueSession.ReceiveOne(ctx, new(StepSessionHandler))
		if err != nil {
			fmt.Println(err)
			return
		}

		if err := queueSession.Close(ctx); err != nil {
			fmt.Println(err)
			return
		}
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
