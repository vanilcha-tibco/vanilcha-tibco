package publish

import (
	"fmt"
	"net/http"

	"git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus"
	"github.com/TIBCOSoftware/flogo-lib/core/activity"
	"github.com/TIBCOSoftware/flogo-lib/core/data"
	"github.com/TIBCOSoftware/flogo-lib/logger"
)

var log = logger.GetLogger("activity-az-servicebus-publish")

// Activity metadata datastructure for AzureServiceBus Activity
type Activity struct {
	metadata *activity.Metadata
}

// NewActivity creates a new activity
func NewActivity(metadata *activity.Metadata) activity.Activity {
	return &Activity{metadata: metadata}
}

// Metadata implements activity.Activity.Metadata
func (a *Activity) Metadata() *activity.Metadata {
	return a.metadata
}

//GetComplexValue safely get the object value
func GetComplexValue(complexObject *data.ComplexObject) interface{} {
	if complexObject != nil {
		return complexObject.Value
	}
	return nil
}

// Eval implements activity.Activity.Eval
func (a *Activity) Eval(context activity.Context) (done bool, err error) {
	log.Info("AzureServiceBus publish message Activity")

	connector := context.GetInput("Connection")
	if connector == nil {
		return false, fmt.Errorf("AzureServiceBus connection not configured")
	}

	connection, err := azservicebus.GetConnection(connector)
	if err != nil {
		return false, fmt.Errorf("Error getting AzureServiceBus connection %s", err.Error())
	}

	log.Debug("Reading entity name")

	oName := context.GetInput("entityName")
	if oName == nil || oName.(string) == "" {
		return false, activity.NewError("AzureServiceBus entity name is not configured", "AZSERVICEBUS-PUBLISH-4002", nil)
	}
	entityName := oName.(string)
	log.Debugf("entityName is %s", entityName)

	inputData := GetComplexValue(context.GetInput("input").(*data.ComplexObject))
	if inputData == nil || inputData == "{}" {
		return false, activity.NewError(fmt.Sprintf("Input is required in publish activity for %s object", entityName), "AZSERVICEBUS-PUBLISH-4015", nil)
	}
	inputMap := inputData.(map[string]interface{})
	body := inputMap["body"]
	if body == nil {
		return false, activity.NewError(fmt.Sprintf("Body is required in publish activity for %s object", entityName), "AZSERVICEBUS-PUBLISH-4013", nil)
	}

	methodName := http.MethodPost

	responseData, err := connection.Call(entityName, inputData, methodName)
	if err != nil {
		return false, activity.NewError(fmt.Sprintf("Failed to perform Azure Service Bus publish message for %s, %s", entityName, err.Error()), "AZSERVICEBUS-PUBLISH-4014", nil)
	}

	objectResponse := make(map[string]interface{})
	objectResponse[entityName] = responseData
	outputComplex := &data.ComplexObject{Metadata: "", Value: objectResponse}
	context.SetOutput("output", outputComplex)
	return true, nil

}
