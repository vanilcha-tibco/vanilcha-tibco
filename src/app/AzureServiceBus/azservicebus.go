package azservicebus

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"net/url"
	"reflect"
	"strconv"
	"strings"

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
		tokenURL                       string
	}
)
type (
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
		ContentType            string `json:"ContentType"`
		CorrelationId          string `json:"CorrelationId"`
		EnqueuedSequenceNumber string `json:"EnqueuedSequenceNumber"`
		ForcePersistence       string `json:"ForcePersistence"`
		Label                  string `json:"Label"`
		MessageId              string `json:"MessageId"`
		PartitionKey           string `json:"PartitionKey"`
		ReplyTo                string `json:"ReplyTo"`
		ReplyToSessionId       string `json:"ReplyToSessionId"`
		SessionId              string `json:"SessionId"`
		To                     string `json:"To"`
		ViaPartitionKey        string `json:"ViaPartitionKey"`
	}
)

//PublishResponse datastructure for storing BrokerProperties
type PublishResponse struct {
	ResponseMessage string `json:"responseMessage"`
	ResponseCode    string `json:"responseCode"`
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
	connectionObject := connector.(map[string]interface{})
	settings := connectionObject["settings"]

	id := connectionObject["id"].(string)
	connection = cachedConnection[id]
	if connection != nil {
		return connection, nil
	}

	connection = &Connection{}
	connection.read(settings)

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
			//resourceURI := connectionRef.FieldByName(element["name"].(string))
			connection.baseURL = "https://" + fmt.Sprint(element["value"].(string)) + ".servicebus.windows.net"
			log.Info("While getting the connection /" + connection.baseURL)
			//resourceURI.SetString(fieldValue)
		case "WI_STUDIO_OAUTH_CONNECTOR_INFO":
			conInfo := element["value"].(string)
			connection.accessToken = fmt.Sprint(conInfo)

		}
	}
	return
}

// doCall is a private implementation helper for making HTTP calls into the Zoho System
func (connection *Connection) doCall(objectType string, objectName string, inputData interface{}, methodName string) (response *http.Response, err error) {
	log.Info("Invoking Azure ServiceBus backend")
	queryURL := ""
	inputMap := make(map[string]interface{})
	if inputData != nil {
		for k, v := range inputData.(map[string]interface{}) {
			inputMap[k] = v
		}
	}
	inputparamtersmap := make(map[string]string)
	for k, v := range inputMap["parameters"].(map[string]interface{}) {
		inputparamtersmap[k] = fmt.Sprint(v)
	}

	if objectType == "Queue" {
		if inputparamtersmap["queueName"] != "" {
			queryURL = connection.baseURL + "/" + inputparamtersmap["queueName"] + "/messages"
		} else {
			queryURL = connection.baseURL + "/" + objectName + "/messages"
		}
	} else {
		if inputparamtersmap["topicName"] != "" {
			queryURL = connection.baseURL + "/" + inputparamtersmap["topicName"] + "/messages"
		} else {
			queryURL = connection.baseURL + "/" + objectName + "/messages"
		}
	}
	log.Info(fmt.Sprintf("%v", inputparamtersmap["messageString"]))
	log.Info(queryURL)
	log.Info("before creating the request")
	req, err := http.NewRequest(methodName, queryURL, bytes.NewBuffer([]byte(inputparamtersmap["messageString"])))
	log.Info(req)
	log.Info("before reading input")
	dataBytes, err := json.Marshal(inputMap["parameters"])
	if err != nil {
		log.Error(err)
	}

	publishInput := PublishRequest{}
	json.Unmarshal(dataBytes, &publishInput)
	req.Header.Add("Content-Type", "application/atom+xml;type=entry;charset=utf-8")
	log.Info(connection.accessToken)
	req.Header.Add("Authorization", connection.accessToken)
	log.Info(publishInput.BrokerProperties)
	if (BrokerProperties{}) != (publishInput.BrokerProperties) {
		var bufferRecep bytes.Buffer
		typeOft := reflect.ValueOf(&publishInput.BrokerProperties).Elem().Type()
		v := reflect.ValueOf(publishInput.BrokerProperties)
		values := make([]interface{}, v.NumField())
		bufferRecep.WriteString("{")
		for i := 0; i < v.NumField(); i++ {
			values[i] = v.Field(i).Interface()
			if fmt.Sprintf("%v", values[i]) != "" {
				bufferRecep.WriteString("\"" + typeOft.Field(i).Name + "\":")

				bufferRecep.WriteString("\"" + fmt.Sprintf("%v", values[i]) + "\"")

				if i+1 != v.NumField() {
					bufferRecep.WriteString(",")
				} else {
					bufferRecep.WriteString("}")
				}
			}
		}
		if bufferRecep.String() != "" {
			req.Header.Add("BrokerProperties", bufferRecep.String())
		}
	}
	log.Info("Deserialized input mapping data... making http call")
	client := &http.Client{}
	response, err = client.Do(req)
	log.Info("Status is %v\n", response.Status)
	if response.Status == "201" {

	}
	jsonResponseData, err := ioutil.ReadAll(response.Body)
	log.Info(string(jsonResponseData))
	if err != nil {
		return nil, fmt.Errorf("http invocation failed %s, status code %v", err.Error(), response.StatusCode)
	}
	return
}

// Call makes an HTTP API call into the Zoho System
func (connection *Connection) Call(objectType string, objectName string, inputData interface{}, methodName string) (responseData map[string]interface{}, err error) {

	log.Infof("Querying Backend Servicebus System for entity name %s", objectName)
	maxRetries := 2
	actulaResponse := PublishResponse{}
	jsonResponse := []byte("")

	for tries := 0; tries < maxRetries; tries++ {
		response, err := connection.doCall(objectType, objectName, inputData, methodName)
		defer response.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("backend invocation error: %s", err.Error())
		}
		jsonResponse, err = ioutil.ReadAll(response.Body)
		if strings.HasPrefix(strconv.Itoa(response.StatusCode), "4") || strings.HasPrefix(strconv.Itoa(response.StatusCode), "5") {
			actulaResponse.ResponseCode = strconv.Itoa(response.StatusCode)
			actulaResponse.ResponseMessage = string(jsonResponse)
			databytes, _ := json.Marshal(actulaResponse)
			s := string(databytes)
			log.Info(s)

			responseData = make(map[string]interface{})
			err = json.Unmarshal(databytes, &responseData)
			log.Info(responseData)
			if err != nil && response.StatusCode != 204 {
				return nil, fmt.Errorf("cannot unmarshall response %s", err.Error())
			}
			return responseData, fmt.Errorf("Publish Message to "+objectType+" failed: %s, %v", response.Status, string(jsonResponse))
		} else if strings.HasPrefix(strconv.Itoa(response.StatusCode), "2") {
			res2B, _ := json.Marshal(actulaResponse)
			fmt.Println(string(res2B))
			actulaResponse.ResponseMessage = string(jsonResponse)
			jsonResponse = []byte(response.Status)
			actulaResponse.ResponseMessage += "Published message to " + objectType + " successfully / " + string(jsonResponse)
			jsonResponse = []byte(strconv.Itoa(response.StatusCode))
			actulaResponse.ResponseCode = string(jsonResponse)
			if err != nil {
				return nil, fmt.Errorf("response reading error %s", err.Error())
			}
			databytes, _ := json.Marshal(actulaResponse)
			s := string(databytes)
			log.Info(s)

			responseData = make(map[string]interface{})
			err = json.Unmarshal(databytes, &responseData)
			log.Info(responseData)
			if err != nil && response.StatusCode != 204 {
				return nil, fmt.Errorf("cannot unmarshall response %s", err.Error())
			}
		}
		return responseData, nil
	}

	return nil, fmt.Errorf("all invocation attempts exhausted")
}

func (connection *Connection) refreshAccessToken() (err error) {

	if connection.docsObject == nil {
		return fmt.Errorf("no docs metadata")
	}

	request, err := http.NewRequest("POST", connection.tokenURL, nil)
	if err != nil {
		return fmt.Errorf("cannot create authenitcation request: %v", err)
	}

	request.Header.Set("User-Agent", "Web Integrator")
	request.Header.Set("Content-Type", "application/json")

	queryParams := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {connection.ClientID},
		"client_secret": {connection.ClientSecret},
		"refresh_token": {connection.refreshToken},
	}

	request.URL.RawQuery = queryParams.Encode()
	resp, err := http.DefaultClient.Do(request)
	if err != nil {
		return fmt.Errorf("invocation error: %v", err)
	}
	defer resp.Body.Close()

	var responseData interface{}
	respBytes, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("cannot convert response %v", err)
	}

	if err := json.Unmarshal(respBytes, &responseData); err != nil {
		return fmt.Errorf("cannot unmarshal response %v", err)
	}

	if responseData.(map[string]interface{})["error"] != nil {
		return fmt.Errorf("%s", responseData.(map[string]interface{})["error"].(string))
	}
	connection.accessToken = responseData.(map[string]interface{})["access_token"].(string)
	return
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
