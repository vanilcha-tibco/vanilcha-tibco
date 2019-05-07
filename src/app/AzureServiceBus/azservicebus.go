package azservicebus

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"time"

	"git.tibco.com/git/product/ipaas/wi-contrib.git/connection/generic"
	servicebus "github.com/Azure/azure-service-bus-go"
	"github.com/TIBCOSoftware/flogo-lib/core/data"
	"github.com/TIBCOSoftware/flogo-lib/logger"
)

type (
	//Connection datastructure for storing zoho connection details
	Connection struct {
		Name                           string
		Description                    string
		WI_STUDIO_OAUTH_CONNECTOR_INFO string
		ClientID                       string
		ClientSecret                   string
		ConfigProperties               string
		DocsMetadata                   string
		docsObject                     map[string]interface{}
		accessToken                    string
		refreshToken                   string
		baseURL                        string
		sharedkey                      string
		authruleName                   string
	}
)
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
type ServiceBusClientConfig struct {
	AuthorizationRuleName string
	PrimarysecondaryKey   string
	ResourceURI           string
}

var log = logger.GetLogger("az-servicebus")

var cachedConnection map[string]*Connection

func init() {
	cachedConnection = map[string]*Connection{}
}

// GetConnection returns a deserialized Zoho conneciton object it does not establish a
// connection with the zoho. If a connection with the same id as in the context is
// present in the cache, that connection from the cache is returned
func GetConnection(connector interface{}) (connection *Connection, err error) {
	genericConn, err := generic.NewConnection(connector)
	if err != nil {
		return nil, errors.New("Failed to load AzureServiceBus connection configuration")
	}
	connectionObject := connector.(map[string]interface{})
	//settings := connectionObject["settings"]

	id := connectionObject["id"].(string)
	connection = cachedConnection[id]
	if connection != nil {
		return connection, nil
	}

	connection = &Connection{}
	//connection.read(settings)
	connection.baseURL, err = data.CoerceToString(genericConn.GetSetting("resourceURI"))
	if err != nil {
		return nil, fmt.Errorf("connection getter for resourceURI failed: %s", err)
	}
	log.Debugf("getconnection processed resourceURI: %s", connection.baseURL)
	connection.authruleName, err = data.CoerceToString(genericConn.GetSetting("authorizationRuleName"))
	if err != nil {
		return nil, fmt.Errorf("connection getter for authorizationRuleName failed: %s", err)
	}
	log.Debugf("getconnection processed authorizationRuleName: %s", connection.authruleName)
	connection.sharedkey, err = data.CoerceToString(genericConn.GetSetting("primarysecondaryKey"))
	if err != nil {
		return nil, fmt.Errorf("connection getter for primarysecondaryKey failed: %s", err)
	}
	log.Debugf("getconnection processed primarysecondaryKey: %s", connection.sharedkey)
	cachedConnection[id] = connection
	return connection, nil

}

func (connection *Connection) read(settings interface{}) (err error) {

	//connectionRef := reflect.ValueOf(connection).Elem()
	//TBD process other types later, right now only strings
	for _, value := range settings.([]interface{}) {
		element := value.(map[string]interface{})
		switch element["name"].(string) {
		case "resourceURI":
			connection.baseURL = fmt.Sprint(element["value"].(string))
			log.Info("While getting the connection /" + connection.baseURL)
		case "authorizationRuleName":
			connection.authruleName = fmt.Sprint(element["value"].(string))
		case "primarysecondaryKey":
			connection.sharedkey = fmt.Sprint(element["value"].(string))
		}
	}
	return
}

// doCall is a private implementation helper for making HTTP calls into the Zoho System
func (connection *Connection) doCall(objectType string, objectName string, inputData interface{}, methodName string) (responseData map[string]interface{}, err error) {
	log.Info("Invoking Azure ServiceBus backend")
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

	connStr := "Endpoint=sb://" + connection.baseURL + ".servicebus.windows.net/;SharedAccessKeyName=" + connection.authruleName + ";SharedAccessKey=" + connection.sharedkey
	ns, err := servicebus.NewNamespace(servicebus.NamespaceWithConnectionString(connStr))
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	readresponseData := make(map[string]interface{})
	var readError error
	dataBytes, err := json.Marshal(inputMap["parameters"])
	if err != nil {
		log.Error(err)
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
			log.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName + " with sessionId " + publishInput.BrokerProperties.SessionId)
		} else {
			log.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName)
		}

		q, err := getQueue(ns, entityName)
		if err != nil {
			if err != nil {
				fmt.Printf("failed to fetch queue named %q\n", entityName)
				actulaResponse.ResponseMessage = string(err.Error())
				databytes, _ := json.Marshal(actulaResponse)
				readError = err
				err = json.Unmarshal(databytes, &readresponseData)
				return readresponseData, readError
			}
		}
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		readError = q.Send(ctx, &reqmessage)
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
			log.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName + " with sessionId " + publishInput.BrokerProperties.SessionId)
		} else {
			log.Info("Contacting Azure Servicebus System to send message to " + objectType + " :" + entityName)
		}
		t, err := getTopic(ns, entityName)
		if err != nil {
			fmt.Printf("failed to fetch topic named %q\n", entityName)
			actulaResponse.ResponseMessage = string(err.Error())
			databytes, _ := json.Marshal(actulaResponse)
			readError = err
			err = json.Unmarshal(databytes, &readresponseData)
			return readresponseData, readError
		}

		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()
		readError = t.Send(ctx, &reqmessage)
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
		log.Info(readresponseData)
	}
	return readresponseData, readError

}

// Call makes an HTTP API call into the Zoho System
func (connection *Connection) Call(objectType string, objectName string, inputData interface{}, methodName string) (responseData map[string]interface{}, err error) {

	maxRetries := 2

	for tries := 0; tries < maxRetries; tries++ {
		responseData, err := connection.doCall(objectType, objectName, inputData, methodName)
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
func getQueue(ns *servicebus.Namespace, queueName string) (*servicebus.Queue, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	qm := ns.NewQueueManager()
	queList, err := qm.List(ctx)
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
		return nil, errors.New("Could not find the specified Queue")
	}
	qe, err := qm.Get(ctx, queueName)
	if err != nil {
		return nil, err
	}
	var q *servicebus.Queue
	var queueError error
	if qe != nil {
		q, queueError = ns.NewQueue(queueName)
	} else {
		q = nil
		queueError = errors.New("Could not find the specified Queue")
	}
	return q, queueError
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
			//	log.Info(topicName, " Topic found")
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
	var t *servicebus.Topic
	var topicError error
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

// BuildConfigurationFromConnection is a util method to be used by Triggers for getting
// ConnectionConfig details in Trigger runtime
func BuildConfigurationFromConnection(connection interface{}) (*ServiceBusClientConfig, error) {

	conn, err := generic.NewConnection(connection)
	if err != nil {
		return nil, errors.New("Failed to load Kafaka client configuration")
	}

	connectionConfig := &ServiceBusClientConfig{}

	connectionConfig.AuthorizationRuleName, _ = data.CoerceToString(conn.GetSetting("authorizationRuleName"))
	connectionConfig.PrimarysecondaryKey, _ = data.CoerceToString(conn.GetSetting("primarysecondaryKey"))
	connectionConfig.ResourceURI, _ = data.CoerceToString(conn.GetSetting("resourceURI"))

	return connectionConfig, nil

}
