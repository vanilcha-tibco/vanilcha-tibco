package azservicebus

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"time"

	azureservicebusconnection "git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus/connector/connection"
	servicebus "github.com/Azure/azure-service-bus-go"
	"github.com/project-flogo/core/support/log"
)

var azureServiceBusActivityLogger = log.ChildLogger(log.RootLogger(), "azureservicebus-activity")

type (
	// PublishRequest data structure
	PublishRequest struct {
		QueueName        string           `json:"queueName"`
		TopicName        string           `json:"topicName"`
		MessageString    string           `json:"messageString"`
		BrokerProperties BrokerProperties `json:"brokerProperties"`
	}
)
type (
	//BrokerProperties datastructure for storing BrokerProperties
	BrokerProperties struct {
		ContentType      string         `json:"ContentType"`
		CorrelationId    string         `json:"CorrelationId"`
		ForcePersistence bool           `json:"ForcePersistence"`
		Label            string         `json:"Label"`
		PartitionKey     string         `json:"PartitionKey"`
		ReplyTo          string         `json:"ReplyTo"`
		ReplyToSessionId string         `json:"ReplyToSessionId"`
		SessionId        string         `json:"SessionId"`
		To               string         `json:"To"`
		TimeToLive       *time.Duration `json:"TimeToLive"`
	}
)

//PublishResponse datastructure for storing BrokerProperties
type PublishResponse struct {
	ResponseMessage string `json:"responseMessage"`
}

// ServiceBusClientConfig to be used by util methods for getting connection config in Service Bus Triggers

// doCall is a private implementation helper for making HTTP calls into the AzureServiceBus System
func doCall(connection *azureservicebusconnection.AzureServiceBusSharedConfigManager, objectType string, objectName string, inputData interface{}, methodName string, timeout int) (responseData map[string]interface{}, err error) {

	azureServiceBusActivityLogger.Info("Invoking Azure ServiceBus backend")
	entityName := ""

	actulaResponse := PublishResponse{}
	inputMap := make(map[string]interface{})
	if inputData != nil {
		for k, v := range inputData.(map[string]interface{}) {
			inputMap[k] = v
		}
	}
	inputparamtersmap := make(map[string]interface{})
	for k, v := range inputMap["parameters"].(map[string]interface{}) {
		inputparamtersmap[k] = fmt.Sprint(v)
	}

	//	log.Info("before creating the request")

	connStr := "Endpoint=sb://" + connection.AzureToken.ResourceURI + ".servicebus.windows.net/;SharedAccessKeyName=" + connection.AzureToken.AuthorizationRuleName + ";SharedAccessKey=" + connection.AzureToken.PrimarysecondaryKey
	ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(connStr))
	if err != nil {
		//fmt.Println(err)
		//log.Error(err)
		return nil, fmt.Errorf("Namespace object could not be created by the SDK due to %s", err.Error())
	}
	readresponseData := make(map[string]interface{})
	var readError error
	dataBytes, err := json.Marshal(inputMap["parameters"])
	if err != nil {
		azureServiceBusActivityLogger.Error(err)
	}
	publishInput := PublishRequest{}
	json.Unmarshal(dataBytes, &publishInput)
	reqSysProperties := servicebus.SystemProperties{}
	if publishInput.BrokerProperties.PartitionKey != "" {
		reqSysProperties.PartitionKey = &publishInput.BrokerProperties.PartitionKey
	}
	reqmessage := servicebus.Message{}
	if publishInput.BrokerProperties.ContentType != "" {
		reqmessage.ContentType = publishInput.BrokerProperties.ContentType
	}
	if publishInput.BrokerProperties.CorrelationId != "" {
		reqmessage.CorrelationID = publishInput.BrokerProperties.CorrelationId
	}
	if inputparamtersmap["messageString"] == nil {
		reqmessage.Data = []byte("")
	} else {
		reqmessage.Data = []byte(inputparamtersmap["messageString"].(string))
	}

	if publishInput.BrokerProperties.Label != "" {
		reqmessage.Label = publishInput.BrokerProperties.Label
	}
	if publishInput.BrokerProperties.ReplyTo != "" {
		reqmessage.ReplyTo = publishInput.BrokerProperties.ReplyTo
	}
	if publishInput.BrokerProperties.To != "" {
		reqmessage.To = publishInput.BrokerProperties.To
	}
	if publishInput.BrokerProperties.TimeToLive != nil {
		reqmessage.TTL = publishInput.BrokerProperties.TimeToLive
	}
	if (reqSysProperties != servicebus.SystemProperties{}) {
		reqmessage.SystemProperties = &reqSysProperties
	}
	// session support
	if publishInput.BrokerProperties.SessionId != "" {
		reqmessage.SessionID = &publishInput.BrokerProperties.SessionId
		//	fmt.Println("sessionid ", publishInput.BrokerProperties.SessionId)
	}
	if objectType == "Queue" {
		if inputparamtersmap["queueName"] != nil && inputparamtersmap["queueName"].(string) != "" {
			// queryURL = connection.baseURL + "/" + inputparamtersmap["queueName"].(string) + "/messages"
			entityName = inputparamtersmap["queueName"].(string)
		} else {
			return nil, fmt.Errorf("Queue Name cannot be empty %s", "")
			// queryURL = connection.baseURL + "/" + objectName + "/messages"
			// entityName = objectName
		}
		if publishInput.BrokerProperties.SessionId != "" {
			azureServiceBusActivityLogger.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName + " with sessionId " + publishInput.BrokerProperties.SessionId)
		} else {
			azureServiceBusActivityLogger.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName)
		}

		if timeout > 0 {

			q, isSession, err := getQueueWithTimeout(ns, entityName, timeout)
			if err != nil {
				//if err != nil {
				azureServiceBusActivityLogger.Errorf("failed to fetch queue named %q\n", entityName)
				actulaResponse.ResponseMessage = string(err.Error())
				databytes, _ := json.Marshal(actulaResponse)
				readError = err
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError
				//}
			}
			if isSession == true && publishInput.BrokerProperties.SessionId == "" {
				actulaResponse.ResponseMessage = string("Session Id is Requied, Entered queue is Session Enabled")
				databytes, _ := json.Marshal(actulaResponse)
				readError = errors.New("Missing SessionId, input queue is Session Enabled")
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError

			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(timeout)) //timeout unit need to fixed
			defer cancel()
			readError = q.Send(ctx, &reqmessage)
		} else {

			q, isSession, err := getQueue(ns, entityName)
			if err != nil {
				//if err != nil {
				azureServiceBusActivityLogger.Errorf("failed to fetch queue named %q\n", entityName)
				actulaResponse.ResponseMessage = string(err.Error())
				databytes, _ := json.Marshal(actulaResponse)
				readError = err
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError
				//}
			}

			if isSession == true && publishInput.BrokerProperties.SessionId == "" {
				actulaResponse.ResponseMessage = string("Session Id is Requied, Entered queue is Session Enabled")
				databytes, _ := json.Marshal(actulaResponse)
				readError = errors.New("Missing SessionId, input queue is Session Enabled")
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError

			}

			ctx := context.Background()
			readError = q.Send(ctx, &reqmessage)
		}

	} else {
		if inputparamtersmap["topicName"] != nil && inputparamtersmap["topicName"].(string) != "" {
			//	queryURL = connection.baseURL + "/" + inputparamtersmap["topicName"].(string) + "/messages"
			entityName = inputparamtersmap["topicName"].(string)
		} else {
			return nil, fmt.Errorf("Topic Name cannot be empty %s", "")
			// queryURL = connection.baseURL + "/" + objectName + "/messages"
			// entityName = objectName
		}

		if publishInput.BrokerProperties.SessionId != "" {
			azureServiceBusActivityLogger.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName + " with sessionId " + publishInput.BrokerProperties.SessionId)
		} else {
			azureServiceBusActivityLogger.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName)
		}

		if timeout > 0 {
			t, err := getTopicWithTimeout(ns, entityName, timeout)
			if err != nil {
				azureServiceBusActivityLogger.Errorf("failed to fetch topic named %q\n", entityName)
				actulaResponse.ResponseMessage = string(err.Error())
				databytes, _ := json.Marshal(actulaResponse)
				readError = err
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError
			}
			ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(timeout))
			defer cancel()
			readError = t.Send(ctx, &reqmessage)

		} else {

			t, err := getTopic(ns, entityName)
			if err != nil {
				azureServiceBusActivityLogger.Errorf("failed to fetch topic named %q\n", entityName)
				actulaResponse.ResponseMessage = string(err.Error())
				databytes, _ := json.Marshal(actulaResponse)
				readError = err
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError
			}

			ctx := context.Background()
			readError = t.Send(ctx, &reqmessage)

		}

	}

	if readError != nil {
		actulaResponse.ResponseMessage = string(readError.Error())
		databytes, _ := json.Marshal(actulaResponse)
		err = json.Unmarshal(databytes, &readresponseData)
		if err != nil {
			return nil, fmt.Errorf("cannot unmarshall response %s", err.Error())
		}

	} else {
		actulaResponse.ResponseMessage += " /Published message to " + objectType + " : " + entityName + " successfully / "
		databytes, _ := json.Marshal(actulaResponse)
		err = json.Unmarshal(databytes, &readresponseData)
		azureServiceBusActivityLogger.Info(readresponseData)
	}
	return readresponseData, readError

}

// Call makes an HTTP API call into the AzureServiceBus System
func Call(connection *azureservicebusconnection.AzureServiceBusSharedConfigManager, objectType string, objectName string, inputData interface{}, methodName string, timeout int) (responseData map[string]interface{}, err error) {
	maxRetries := 2

	for tries := 0; tries < maxRetries; tries++ {
		responseData, err := doCall(connection, objectType, objectName, inputData, methodName, timeout)
		if err != nil {
			return nil, fmt.Errorf("backend invocation error: %s", err.Error())
		}
		return responseData, nil
	}

	return nil, fmt.Errorf("all invocation attempts exhausted")
}

func getBody(content interface{}) (io.Reader, error) {
	var reqBody io.Reader
	switch content.(type) {
	case string:
		reqBody = bytes.NewBuffer([]byte(content.(string)))
	default:
		b, err := json.Marshal(content)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(b)
	}
	return reqBody, nil
}
func getQueue(ns *servicebus.Namespace, queueName string) (*servicebus.Queue, bool, error) {

	ctx := context.Background()
	qm := ns.NewQueueManager()
	queList, err := qm.List(ctx)
	if err != nil {
		return nil, false, err
	}
	queNotExist := true
	for _, entry := range queList {
		//	fmt.Println(idx, " ", entry.Name)
		if queueName == entry.Name {
			//	log.Info(queueName, " Queue found")
			queNotExist = false
			break
		}
	}
	if queNotExist {
		return nil, false, errors.New("Could not find the specified Queue :" + queueName)
	}
	qe, err := qm.Get(ctx, queueName)
	if err != nil {
		return nil, false, err
	}
	var q *servicebus.Queue
	var queueError error
	// need to test and remove below if else block
	if qe != nil {
		q, queueError = ns.NewQueue(queueName)
	} else {
		q = nil
		queueError = errors.New("Could not find the specified Queue")
	}

	isSession := *qe.QueueDescription.RequiresSession

	return q, isSession, queueError
}

func getQueueWithTimeout(ns *servicebus.Namespace, queueName string, timeout int) (*servicebus.Queue, bool, error) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(timeout))
	defer cancel()

	qm := ns.NewQueueManager()
	queList, err := qm.List(ctx)
	if err != nil {
		return nil, false, err
	}
	queNotExist := true
	for _, entry := range queList {
		//	fmt.Println(idx, " ", entry.Name)
		if queueName == entry.Name {
			//	log.Info(queueName, " Queue found")
			queNotExist = false
			break
		}
	}
	if queNotExist {
		return nil, false, errors.New("Could not find the specified Queue :" + queueName)
	}
	qe, err := qm.Get(ctx, queueName)
	if err != nil {
		return nil, false, err
	}
	var q *servicebus.Queue
	var queueError error
	// need to test and remove below if else block
	if qe != nil {
		q, queueError = ns.NewQueue(queueName)
	} else {
		q = nil
		queueError = errors.New("Could not find the specified Queue")
	}

	isSession := *qe.QueueDescription.RequiresSession

	return q, isSession, queueError
}

func getTopic(ns *servicebus.Namespace, topicName string) (*servicebus.Topic, error) {
	ctx := context.Background()
	tm := ns.NewTopicManager()
	topicList, err := tm.List(ctx)
	if err != nil {
		return nil, err
	}
	topicNotExist := true
	for _, entry := range topicList {
		//	fmt.Println(idx, " ", entry.Name)
		if topicName == entry.Name {
			//	log.Info(topicName, " Topic found")
			topicNotExist = false
			break
		}
	}
	if topicNotExist {
		return nil, errors.New("Could not find the specified Topic :" + topicName)
	}
	te, err := tm.Get(ctx, topicName)
	if err != nil {
		return nil, err
	}
	var t *servicebus.Topic
	var topicError error
	// need to test and remove below if else block
	if te != nil {
		// session support
		//	t, topicError = ns.NewTopic(ctx, topicName)
		t, topicError = ns.NewTopic(topicName)
	} else {
		t = nil
		topicError = errors.New("Could not find the specified Topic")
	}
	return t, topicError

}

func getTopicWithTimeout(ns *servicebus.Namespace, topicName string, timeout int) (*servicebus.Topic, error) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond*time.Duration(timeout))
	defer cancel()

	tm := ns.NewTopicManager()
	topicList, err := tm.List(ctx)
	if err != nil {
		return nil, err
	}
	topicNotExist := true
	for _, entry := range topicList {
		//	fmt.Println(idx, " ", entry.Name)
		if topicName == entry.Name {
			//	log.Info(topicName, " Topic found")
			topicNotExist = false
			break
		}
	}
	if topicNotExist {
		return nil, errors.New("Could not find the specified Topic :" + topicName)
	}
	te, err := tm.Get(ctx, topicName)
	if err != nil {
		return nil, err
	}
	var t *servicebus.Topic
	var topicError error
	// need to test and remove below if else block
	if te != nil {
		// session support
		//	t, topicError = ns.NewTopic(ctx, topicName)
		t, topicError = ns.NewTopic(topicName)
	} else {
		t = nil
		topicError = errors.New("Could not find the specified Topic")
	}
	return t, topicError

}
