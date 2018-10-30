/**
 * Created by vpurohit on 8/21/18.
 */

var baseAzureServiceBus = function () {

    // BEGIN - Mandatory code so that WI functionality can be used by the connector.
    this.WI_Location = "./../../../WI/";

    this.connectorsConfig = require(this.WI_Location + "utilities/connectorsConfig.js");
    // END - Mandatory code so that WI functionality can be used by the connector.

    // BEGIN - Functions exposed by the connector that can be used by others.
    this.connectionModalMethods = function () {
        return require('./page_objects/connectionModal/connectionModalMethods.js');
    };

    this.AzureServiceBusPaletteMethods = function () {
        return require('./page_objects/Palette/PaletteMethods.js');
    };


    // END - Functions exposed by the connector that can be used by others.

    // BEGIN - Connection details used while creating a connection.
    this.connectionDetails = {
        name: "AzureServiceBusConnection",
        description: "Tibco azureServiceBusConnection",
        username: process.env.Zuora_username || "gkchaitu279@dispostable.com",
        password: process.env.Zuora_password || "$Tibco2018$",
        azureservicebusAuthRule: "AuthRule",
        azureservicebusNameSpace: "ServicebusQA001",
        azureservicebusKey: "eFxVfMG/8ssXCmm9BQFuEymrVnYpFvJWTxkr0nuXPQw=",
        isProduction: "false",
        operation_Publish: "Create Subscription",
        operation_Update_Subscription: "Update Subscription",
        operation_Delete_Subscription: "Delete Subscription",
        operation_Get_Subscription: "Get Subscription"
        , AzureServiceBusPublish: 'AzureServiceBus Publish'
        , AzureServiceBusPublish1: 'AzureServiceBusPublish'
        , AzureServiceBusPublish2: 'AzureServiceBusPublish1'
        , TopicSubscriber: 'AzureServiceBusTopicSubscriber'
        , QueueReceiver: 'AzureServiceBusQueueReceiver'
    };

    this.consecutiveConnectionDetails = {
        name: "Second_Zuora_connection",
        description: "Tibco Zuora Connection",
        username: process.env.Zuora_username || "vnalawad@tibco.com",
        password: process.env.Zuora_password || "$Tibco2018$",
        isProduction: "false",
        operation_Create_Subscription: "Create Subscription",
        operation_Update_Subscription: "Update Subscription",
        operation_Delete_Subscription: "Delete Subscription",
        operation_Get_Subscription: "Get Subscription"
    };
    global.EC = protractor.ExpectedConditions
};
module.exports = new baseAzureServiceBus();