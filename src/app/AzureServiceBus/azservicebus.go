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

var log = logger.GetLogger("zoho-crm")

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

	connectionRef := reflect.ValueOf(connection).Elem()

	//TBD process other types later, right now only strings
	for _, value := range settings.([]interface{}) {
		element := value.(map[string]interface{})
		field := connectionRef.FieldByName(element["name"].(string))
		fieldValue := element["value"].(string)
		field.SetString(fieldValue)
	}

	if connection.docsObject == nil {
		var docsMetadata interface{}
		err = json.Unmarshal([]byte(connection.DocsMetadata), &docsMetadata)

		if err != nil {
			return fmt.Errorf("Cannot deserialize schema document from connection")
		}
		connection.docsObject = docsMetadata.(map[string]interface{})
		connection.baseURL = connection.docsObject["baseURL"].(string)
		connection.tokenURL = "https://accounts.zoho.com/oauth/v2/token" //TBD in docsMetadata
	}

	if connection.accessToken == "" && connection.refreshToken == "" {
		var oAuthInfo map[string]interface{}
		err = json.Unmarshal([]byte(connection.WI_STUDIO_OAUTH_CONNECTOR_INFO), &oAuthInfo)

		if err != nil {
			return fmt.Errorf("Cannot deserialize connections OAuth Info")
		}
		connection.accessToken = oAuthInfo["access_token"].(string)
		connection.refreshToken = oAuthInfo["refresh_token"].(string)
	}

	return
}

// doCall is a private implementation helper for making HTTP calls into the Zoho System
func (connection *Connection) doCall(objectName string, inputData interface{}, methodName string) (response *http.Response, err error) {
	log.Info("Invoking Azure ServiceBus backend")

	queryParams := url.Values{}
	var requestBody io.Reader
	if inputData != nil && inputData != "{}" {

		inputMap := inputData.(map[string]interface{})

		body := inputMap["body"]
		if body != nil {
			requestBody, _ = getBody(body)
		}

	}

	queryURL := connection.baseURL

	req, err := http.NewRequest(methodName, queryURL, requestBody)
	req.Header.Add("Content-Type", "application/atom+xml")
	req.Header.Add("Authorization", connection.accessToken)

	req.URL.RawQuery = queryParams.Encode()

	log.Debug("Deserialized input mapping data... making http call")
	client := &http.Client{}
	response, err = client.Do(req)
	log.Debugf("Status is %v\n", response.Status)
	if err != nil {
		return nil, fmt.Errorf("http invocation failed %s, status code %v", err.Error(), response.StatusCode)
	}
	return
}

// Call makes an HTTP API call into the Zoho System
func (connection *Connection) Call(objectName string, inputData interface{}, methodName string) (responseData map[string]interface{}, err error) {

	log.Infof("Querying Backend Servicebus System for entity name %s", objectName)
	maxRetries := 2
	for tries := 0; tries < maxRetries; tries++ {
		response, err := connection.doCall(objectName, inputData, methodName)
		defer response.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("backend invocation error: %s", err.Error())
		}

		switch {
		case response.StatusCode == 401:
			log.Debug("Access token expired. Renewing ...")
			err = connection.refreshAccessToken()
			if err != nil {
				return nil, fmt.Errorf("access token renewal failed: %s ", err.Error())
			}
		case response.StatusCode > 401:
			return nil, fmt.Errorf("invocation failed: %s, %v", response.Status, response.StatusCode)
		default:
			jsonResponse := []byte("")
			if response.Body != nil {
				jsonResponse, err = ioutil.ReadAll(response.Body)
			} else {
				jsonResponse = []byte(response.Status)
			}
			if err != nil {
				return nil, fmt.Errorf("response reading error %s", err.Error())
			}

			responseData = make(map[string]interface{})
			err = json.Unmarshal(jsonResponse, &responseData)
			if err != nil && response.StatusCode != 204 {
				return nil, fmt.Errorf("cannot unmarshall response %s", err.Error())
			}
			return responseData, nil
		}
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
