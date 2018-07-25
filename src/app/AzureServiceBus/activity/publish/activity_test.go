package publish

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"testing"

	"git.tibco.com/git/product/ipaas/wi-zoho.git/src/app/Zoho-CRM"
	"github.com/TIBCOSoftware/flogo-contrib/action/flow/test"
	"github.com/TIBCOSoftware/flogo-lib/core/activity"
	"github.com/TIBCOSoftware/flogo-lib/core/data"
	"github.com/TIBCOSoftware/flogo-lib/logger"
	"github.com/stretchr/testify/assert"
)

var activityMetadata *activity.Metadata
var serviceBusConnectionJSON = `{
	"id": "09630510-6e30-11e8-aa07-f9c6f2436efe",
	"title": "ServiceBus Connector",
	"name": "tibco-office",
	"author": "TIBCO Software Inc.",
	"type": "flogo:connector",
	"version": "1.0.0",
	"display": {
	  "description": "Operations on office",
	  "category": "office",
	  "visible": true
	},
	"ref": "git.tibco.com/git/product/ipaas/wi-office.git/office/connector/connection",
	"keyfield": "name",
	"settings": [{
		"name": "name",
		"type": "string",
		"required": true,
		"display": {
		  "name": "Connection Name",
		  "visible": true
		}
	  },
	  {
		"name": "description",
		"type": "string",
		"display": {
		  "name": "Description",
		  "visible": true
		}
	},
	{
		"name": "resourceURI",
		"type": "string",
		"required": true,
		"display": {
		  "name": "Resource URI",
		  "visible": true
		},
		"value":"https://spaddindev.servicebus.windows.net"
	  },
	  {
		"name": "WI_STUDIO_OAUTH_CONNECTOR_INFO",
		"type": "string",
		"required": true,
		"display": {
		  "visible": false
		},
		"value":"{\"token_type\":\"SharedAccessSignature\",\"access_token\":\"SharedAccessSignature sr=https%3A%2F%2Fspaddindev.servicebus.windows.net%2F&sig=VPxg11tdFNTQ3ZYhrZE3%2B%2Bmach%2Fw62OzM7vbDRsNxQY%3D&se=1532675283&skn=PluginServiceBus\"}"
	  }
	],
	"actions": [{
	  "name": "Login"
	}]
  }`

func getConnector(t *testing.T, jsonConnection string) (map[string]interface{}, error) {
	connector := make(map[string]interface{})
	err := json.Unmarshal([]byte(jsonConnection), &connector)
	if err != nil {
		t.Errorf("Error: %s", err.Error())
		return nil, err
	}
	return connector, nil
}

func getConnection(t *testing.T, jsonConnection string) (connection *zoho.Connection, err error) {
	connector, err := getConnector(t, jsonConnection)
	assert.NotNil(t, connector)

	connection, err = zoho.GetConnection(connector)
	if err != nil {
		t.Errorf("Zoho CRM get connection failed %s", err.Error())
		t.Fail()
	}
	assert.NotNil(t, connection)
	return
}

func getActivityMetadata() *activity.Metadata {
	if activityMetadata == nil {
		jsonMetadataBytes, err := ioutil.ReadFile("activity.json")
		if err != nil {
			panic("No Json Metadata found for activity.json path")
		}
		activityMetadata = activity.NewMetadata(string(jsonMetadataBytes))
	}
	return activityMetadata
}

func TestPublishMessage(t *testing.T) {

	log.SetLogLevel(logger.DebugLevel)
	log.Info("****TEST : Executing Create folder test for testing conflict behavior replace start****")
	activity := NewActivity(getActivityMetadata())
	tc := test.NewTestActivityContext(activity.Metadata())
	var connection interface{}
	err := json.Unmarshal([]byte(serviceBusConnectionJSON), &connection)
	if err != nil {
		t.Errorf("Deserialization of connection failed %s", err.Error())
		t.Fail()
	}
	cmap := connection.(map[string]interface{})
	settings := cmap["settings"]
	cmap["settings"] = settings
	tc.SetInput("Connection", cmap)
	tc.SetInput("entityName", "Queue")

	//	/api/campaign/version/3/do/read/id/<id>?...
	//https://pi.zoho.com/api/login/version/3
	// queryURL := connection.baseURL + "/" + objectName + "/version/3/do/read/{id}"

	var inputParams interface{}
	var inputJSON = []byte(`{
		"queueName": "testqueue",
		"messageString":"<string xmlns=\"http://schemas.microsoft.com/2003/10/Serialization/\">This is a test message.</string>",
		"brokerProperties":{"Label":"M1"}
	}`)

	err = json.Unmarshal(inputJSON, &inputParams)
	assert.Nil(t, err)
	complexInput := &data.ComplexObject{Metadata: "", Value: inputParams}
	tc.SetInput("input", complexInput)

	_, err = activity.Eval(tc)
	assert.Nil(t, err)
	if err != nil {
		t.Errorf("Could not fetch campaign by id, %s", err.Error())
		fmt.Printf("Error: %s", err.Error())
		t.Fail()
	} else {
		complexOutput := tc.GetOutput("output")
		assert.NotNil(t, complexOutput)
		outputData := complexOutput.(*data.ComplexObject).Value
		dataBytes, err := json.Marshal(outputData)

		jsonString := string(dataBytes)
		t.Logf("%s", jsonString)
		fmt.Println(jsonString)
		assert.Nil(t, err)
		assert.NotNil(t, dataBytes)
	}
}
