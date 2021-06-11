package publish

import (
	"fmt"
	"net/http"

	azservicebus "git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus"
	azureservicebusconnection "git.tibco.com/git/product/ipaas/wi-azservicebus.git/src/app/AzureServiceBus/connector/connection"
	"github.com/project-flogo/core/activity"
)

//Oss upgrade--

var activityMd = activity.ToMetadata(&Input{}, &Output{})

func init() {
	_ = activity.Register(&AzureServiceBusPublishActivity{}, New)
}

func New(ctx activity.InitContext) (activity.Activity, error) {
	return &AzureServiceBusPublishActivity{}, nil
}

type AzureServiceBusPublishActivity struct {
}

func (*AzureServiceBusPublishActivity) Metadata() *activity.Metadata {
	return activityMd
}

// Eval implements activity.Activity.Eval
func (a *AzureServiceBusPublishActivity) Eval(context activity.Context) (done bool, err error) {

	context.Logger().Info("AzureServiceBus publish message Activity")
	//log.Info("AzureServiceBus publish message Activity")
	input := &Input{}

	err = context.GetInputObject(input)
	if err != nil {
		return false, err
	}

	connection, _ := input.AzureServiceBusConnection.(*azureservicebusconnection.AzureServiceBusSharedConfigManager)
	context.Logger().Debug("Reading entity name")

	oName := input.EntityName
	timeout := input.Timeout
	entityType := input.EntityType
	entityName := oName
	inputData := input.Input
	if inputData == nil {
		return false, activity.NewError(fmt.Sprintf("Input is required in publish activity for %s object", entityName), "AZSERVICEBUS-PUBLISH-4015", nil)
	}

	methodName := http.MethodPost

	responseData, err := azservicebus.Call(connection, entityType, entityName, inputData, methodName, timeout)
	if err != nil {
		return false, activity.NewError(fmt.Sprintf("Failed to perform Azure Service Bus publish message for %s, %s", entityType, err.Error()), "AZSERVICEBUS-PUBLISH-4014", nil)
	}

	objectResponse := make(map[string]interface{})
	objectResponse["publish"] = responseData

	output := &Output{}
	output.Output = objectResponse
	err = context.SetOutputObject(output)
	if err != nil {
		return false, err
	}
	context.Logger().Debug("AzureServicebus Publish Activity successfully executed")
	return true, nil

}
