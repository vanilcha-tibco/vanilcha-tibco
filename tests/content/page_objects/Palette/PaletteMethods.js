/**
 * Created by KrishnaChaitanyaGuttikonda on 10/29/17.
 */

/**
 * Contains all the methods used on the AzureServiceBus modal for the Web Integrator.
 */
var PaletteMethods = function () {

    var PaletteElements = require('./PaletteElements.js');
    var azureServiceBusSettings = require('./../../baseAzureServiceBus.js');
    var utilities = azureServiceBusSettings.connectorsConfig.utilitiesFile;
    var loggerFile = azureServiceBusSettings.connectorsConfig.loggerFile;
    var timeOutDuration = azureServiceBusSettings.connectorsConfig.settings.timeOutDuration;
    var baseWI = azureServiceBusSettings.connectorsConfig.baseWI;
    var baseFE = azureServiceBusSettings.connectorsConfig.baseFE;
    var connectionDetails = azureServiceBusSettings.connectionDetails;
    var EC = protractor.ExpectedConditions;
    /**
     * Hovers over an activity to add a AzureServicePublish activity.
     */
    /*
    this.addAzureServiceBusPublishActivity = function (previousActivity, newActivity) {
        loggerFile.debug("Configuring " + newActivity);
        baseWI.flowDesignPageMethods().addNewActivity(previousActivity);
        baseWI.commonMethods().clickAzureServiceBusCategory();
        baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(newActivity);
    };*/

    this.addAzureServiceBusPublishActivity = function (newActivity) {
        browser.sleep(20000);
        browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        browser.sleep(5000);
        utilities.clickElement(PaletteElements.AzureServiceBusTab(), "AzureServiceBus Connection Name");
        browser.sleep(5000);
        baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(newActivity);
        browser.sleep(1000);
    };

    /**
     * Sets the AzureServiceBus Connection as per the given parameter.
     * @param connectionName
     */


    this.setConnectionName = function (connectionName) {

        browser.sleep(1000);
        utilities.clickElement(PaletteElements.connectionSelectlist(), "AzureServiceBus Connection Name List");
        browser.sleep(1000);
        browser.wait(EC.presenceOf(PaletteElements.connectionSelectlistoption(connectionName)),10000);
        utilities.clickElement(PaletteElements.connectionSelectlistoption(connectionName), "AzureServiceBus Connection Name");

    };

    this.setEntityType = function (EntityType) {

        browser.sleep(1000);
        utilities.clickElement(PaletteElements.EntitySelect(), "AzureServiceBus EntitySelection List");
        browser.sleep(1000);
        browser.wait(EC.presenceOf(PaletteElements.EntitySelectValue(EntityType)),10000);
        utilities.clickElement(PaletteElements.EntitySelectValue(EntityType), "AzureServiceBus Connection Name");

    };


    /**
     * Sets the AzureServiceBus Object as per the given parameter.
     * @param objectName
     */
    this.setObjectName = function (objectName) {

        browser.sleep(1000);
        utilities.clickElement(PaletteElements.EntitySelect(), "AzureServiceBus Entity Name List");
        browser.sleep(5000);
        browser.wait(EC.presenceOf(PaletteElements.EntitySelectValue(objectName)),10000);
        utilities.clickElement(PaletteElements.EntitySelectValue(objectName), "SugarCRM Object Name is " + objectName);
        browser.sleep(1000); //TODO - Update when IPAS-4747 is fixed.
    };


    this.configureAzureActivity = function(connectionName, objectName){
        this.setConnectionName(connectionName);
        browser.sleep(3000);
        this.setObjectName(objectName);

    };


    this.clickTopicSubscriberTrigger = function () {
        utilities.clickElement(AzureServiceBusPublishModalElements.topicSubscriberTrigger(), "clicking on TopicSubscriber");
    }

    this.clickQueueRecieverTrigger = function () {
        utilities.clickElement(AzureServiceBusPublishModalElements.queueRecieverTrigger(), "clicking on QueueReciever");
    }


    /**
     * Clicks on the Input tab.
     */
    this.clickInputTab = function () {
        utilities.clickElement(PaletteElements.inputTabspublish(), "Input tab sugarCRM");
    };


};
module.exports = new PaletteMethods();