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
	"github.com/stretchr/testify/assert"
)

var activityMetadata *activity.Metadata

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

func TestCreateCampaign(t *testing.T) {

	connectionBytes, err := ioutil.ReadFile("connectionFull.json")
	if err != nil {
		panic("connectionFull.json file found")
	}
	var connection interface{}
	err = json.Unmarshal(connectionBytes, &connection)
	if err != nil {
		t.Errorf("Deserialization of connection failed %s", err.Error())
		t.Fail()
	}
	cmap := connection.(map[string]interface{})
	cname := cmap["connectorName"]

	log.Debug("connection name is %s", cname)
	connector := cmap["connector"]
	settings := connector.(map[string]interface{})["settings"]
	cmap["settings"] = settings

	activityMetadata := getActivityMetadata()

	activity := NewActivity(activityMetadata)
	tc := test.NewTestActivityContext(activityMetadata)

	tc.SetInput("zohoConnection", connection)
	tc.SetInput("objectName", "campaign")
	tc.SetInput("path", "/campaign/version/3/do/create")

	//	/api/campaign/version/3/do/read/id/<id>?...
	//https://pi.zoho.com/api/login/version/3
	// queryURL := connection.baseURL + "/" + objectName + "/version/3/do/read/{id}"

	var inputParams interface{}
	var inputJSON = []byte(`{
		"parameters": {
			"name" : "Look for Water",
			"cost": "20.00"
		}
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
