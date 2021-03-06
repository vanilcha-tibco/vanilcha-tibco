/**
 * Created by KrishnaChaitanyaGuttikonda on 10/29/17.
 */

const { text } = require('cheerio/lib/api/manipulation');
const { browser } = require('protractor');

/**
 * Contains all the methods used on the AzureServiceBus modal for the Web Integrator.
 */
var PaletteMethods;
PaletteMethods = function () {

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

    this.addAzureServiceBusPublishActivity = function (previousActivity, newActivity) {
        loggerFile.debug("Configuring " + newActivity);
        baseWI.flowDesignPageMethods().addNewActivity(previousActivity);
        baseWI.commonMethods().clickAzureServiceBusCategory();
        baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(newActivity);
    };


    //Log message
    this.addAndConfigureLogMessage = function (logMessage, logLevel, previousActivityName) {

        browser.sleep(1000); // Added to resolve stale element reference error in FE mode.
        // }

        if (previousActivityName == "Trigger") {
            baseWI.flowDesignPageMethods().addNewActivityAtPosition(1);
        }
        else {
            baseWI.flowDesignPageMethods().addNewActivity(previousActivityName);

        }
        baseWI.flowDesignPageMethods().selectActivityCategoryFromPallet(baseWI.commonElements().activityTabType.General);
        baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.LogMessage);

        if (logLevel != 0) {
            baseWI.logMessageMethods().setLogLevelUnit(logLevel);
        }
        if (logMessage != 0) {
            baseWI.logMessageMethods().setLogMessageValue(logMessage);
        }


    }



this.connectionSelectlistoption = function (option) {
        return element(by.xpath("//option[contains(text(),'" + option + "')]"));
    }
    this.selectConnectionInstance = function (connectionName) {
        browser.wait(EC.presenceOf(this.connectionSelectlistoption(connectionName)), 10000, connectionName + ' not found on UI');
        utilities.clickElement(this.connectionSelectlistoption(connectionName), "ServiceBus Connection Name");
    };

    this.configureTrigger_Output = function (output) {
        var that = this;
        //output = "pathParams.sfmkt,body.Account.records";
        //for (var i = 0; i < output.length; i++) {
        //  var output_key = output[i];
        log.debug("------------- " + output);
        baseWI.commonActivityMethods().selectInputField(output);

        log.debug("Output is " + "$flow." + output);
        baseWI.commonActivityMethods().selectOutputField("$trigger." + output);
    };

    /* AzureServiceBus QueueReciever*/
    this.createAzureQueueReciever = function (flowName, flowDescription, connection, QueueName, sessionId) {
        var that = this;
        baseWI.createFlowWindowMethods().setBasicFlowDetails(flowName, flowDescription, baseWI.commonElements().connectionType.Trigger,
            "AzureServiceBus QueueReceiver");
        //browser.wait(EC.presenceOf(that.createFlowWindowElements().resourcePath()), 5000,"REST trigger flow UI did not appear on UI")

        baseWI.flowDesignPageMethods().clickAddTriggerButton();
        baseWI.flowDesignPageMethods().clickSelectNewTriggerTab();
        baseWI.createFlowWindowMethods().selectTriggerType("AzureServiceBus QueueReceiver");
        that.selectConnectionInstance(connectionDetails.name);
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickContinueButton();

        baseWI.createFlowWindowMethods().clickCopySchemaButton();
        baseWI.flowDesignPageMethods().clickFlowInputAndOutputBar();
        browser.sleep(500);
        browser.findElement(by.xpath("//a[contains(@class,'triggers-list-element')]")).click();
        //browser.sleep(500);
        browser.findElement(by.xpath("//input[@id='queue']")).sendKeys(QueueName);
        //browser.sleep(500);
        browser.findElement(by.xpath("//input[@id='sessionId']")).sendKeys(sessionId);
        //browser.sleep(500);
        browser.findElement(by.xpath("//div[contains(text(),'Map to Flow Inputs')]")).click();

        that.configureTrigger_Output("output");
        browser.sleep(500);
        baseWI.flowDesignPageMethods().clickCloseServerlessTriggerConfig();
        //browser.sleep(500);


        /*browser.wait(EC.elementToBeClickable(baseWI.appImplementationPageElements().nthFlowByName(flowName)), 60000);
        baseWI.appImplementationPageMethods().clickFlowByName(flowName);
        browser.sleep(10000);
        browser.findElement(by.xpath("//div[contains(@class,'titleHelper flow-detail-diagram-node-draggable') and contains(text(),'AzureServiceBusQueueReceiver')]")).click();
        browser.sleep(3000);
        browser.findElement(by.xpath("//input[@id='queue']")).sendKeys(QueueName);
        //browser.findElement(by.xpath("//input[@id='subscriptionName]")).sendKeys(SubscriptionName); */
    };
   
    this.createAzureQueueRecieverDlq = function (flowName, flowDescription, connection, QueueName) {
        var that = this;
        baseWI.createFlowWindowMethods().setBasicFlowDetails(flowName, flowDescription, baseWI.commonElements().connectionType.Trigger,
            "AzureServiceBus QueueReceiver");
        //browser.wait(EC.presenceOf(that.createFlowWindowElements().resourcePath()), 5000,"REST trigger flow UI did not appear on UI")

        baseWI.flowDesignPageMethods().clickAddTriggerButton();
        baseWI.flowDesignPageMethods().clickSelectNewTriggerTab();
        baseWI.createFlowWindowMethods().selectTriggerType("AzureServiceBus QueueReceiver");
        that.selectConnectionInstance(connectionDetails.name);
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickContinueButton();

        baseWI.createFlowWindowMethods().clickCopySchemaButton();
        baseWI.flowDesignPageMethods().clickFlowInputAndOutputBar();
        browser.sleep(500);
        browser.findElement(by.xpath("//a[contains(@class,'triggers-list-element')]")).click();
        //browser.sleep(500);
        browser.findElement(by.xpath("//input[@id='queue']")).sendKeys(QueueName);
        //browser.sleep(500);
        // browser.driver.findElement(by.xpath("//div[contains(@class,'radio')]//label[1]")).click();
        utilities.clickElement(PaletteElements.deadlettersubscriptionenabled(), "AzureServiceBus Queue Receiver deadletter enabled");
        //browser.findElement(by.xpath("//input[@id='sessionId']")).sendKeys(sessionId);
        //browser.sleep(500);
        browser.findElement(by.xpath("//div[contains(text(),'Map to Flow Inputs')]")).click();

        that.configureTrigger_Output("output");
        browser.sleep(500);
        baseWI.flowDesignPageMethods().clickCloseServerlessTriggerConfig();
        //browser.sleep(500);

        
    };



    //AzureServiceBus TopicSubscriberFlow
    this.createAzureTopicSubscriber = function (flowName, flowDescription, connection, TopicName, SubscriptionName, sessionId) {
        var that = this;

        baseWI.createFlowWindowMethods().setBasicFlowDetails(flowName, flowDescription, baseWI.commonElements().connectionType.Trigger, "AzureServiceBus TopicSubscriber");
        //browser.sleep(500);
        baseWI.flowDesignPageMethods().clickAddTriggerButton();
        baseWI.createFlowWindowMethods().selectTriggerType("AzureServiceBus TopicSubscriber");
        that.selectConnectionInstance(connectionDetails.name);
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickContinueButton();
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickCopySchemaButton();
        baseWI.flowDesignPageMethods().clickFlowInputAndOutputBar();
        //browser.sleep(500);
        browser.findElement(by.xpath("//a[contains(@class,'triggers-list-element')]")).click();
//browser.sleep(1000);
        browser.findElement(by.xpath("//input[@id='topic']")).sendKeys(TopicName);
        //browser.sleep(500);
        browser.findElement(by.xpath("//input[@id='subscriptionName']")).sendKeys(SubscriptionName);
        //browser.sleep(500);
        browser.findElement(by.xpath("//input[@id='sessionId']")).sendKeys(sessionId);
        //browser.sleep(500);
        browser.findElement(by.xpath("//div[contains(text(),'Map to Flow Inputs')]")).click();

        that.configureTrigger_Output("output");
        //browser.sleep(500);
        baseWI.flowDesignPageMethods().clickCloseServerlessTriggerConfig();
        //browser.sleep(500);
    };

    this.createAzureTopicSubscriberDlq = function (flowName, flowDescription, connection, TopicName, SubscriptionName) {
        var that = this;

        baseWI.createFlowWindowMethods().setBasicFlowDetails(flowName, flowDescription, baseWI.commonElements().connectionType.Trigger, "AzureServiceBus TopicSubscriber");
        //browser.sleep(500);
        baseWI.flowDesignPageMethods().clickAddTriggerButton();
        baseWI.createFlowWindowMethods().selectTriggerType("AzureServiceBus TopicSubscriber");
        that.selectConnectionInstance(connectionDetails.name);
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickContinueButton();
        //browser.sleep(500);
        baseWI.createFlowWindowMethods().clickCopySchemaButton();
        baseWI.flowDesignPageMethods().clickFlowInputAndOutputBar();
        //browser.sleep(500);
        browser.findElement(by.xpath("//a[contains(@class,'triggers-list-element')]")).click();
       // browser.findElement(by.xpath(text,))
       
//browser.sleep(1000);
        browser.findElement(by.xpath("//input[@id='topic']")).sendKeys(TopicName);
        //browser.sleep(500);
        //browser.driver.findElement(by.xpath("//div[contains(@class,'radio')]//label[1]")).click();
        utilities.clickElement(PaletteElements.deadlettersubscriptionenabled(), "AzureServiceBus Topic Subscriber deadletter enabled");
        browser.findElement(by.xpath("//input[@id='subscriptionName']")).sendKeys(SubscriptionName);
        //browser.sleep(500);
       // browser.findElement(by.xpath("//input[@id='sessionId']")).sendKeys(sessionId);
        //browser.sleep(500);
        browser.findElement(by.xpath("//div[contains(text(),'Map to Flow Inputs')]")).click();

        that.configureTrigger_Output("output");
        //browser.sleep(500);
        baseWI.flowDesignPageMethods().clickCloseServerlessTriggerConfig();
        //browser.sleep(500);
    };


    this.addAzureServiceBusPublishActivity = function (newActivity) {
        //browser.sleep(500);
        browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        utilities.clickElement(PaletteElements.AzureServiceBusTab(), "AzureServiceBus");

        browser.driver.findElement(by.xpath(("//div[contains(@class, 'ta-type')]//div[contains(text(), 'AzureServiceBus Publish')]"))).click();
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(newActivity);

    };



    /**
     * Sets the AzureServiceBus Connection as per the given parameter.
     * @param connectionName
     */


    this.setConnectionName = function (connectionName) {

        browser.sleep(500);
        utilities.clickElement(PaletteElements.connectionSelectlist(), "AzureServiceBus Connection Name List");
        browser.sleep(500);
        browser.wait(EC.presenceOf(PaletteElements.connectionSelectlistoption(connectionName)), 10000);
        utilities.clickElement(PaletteElements.connectionSelectlistoption(connectionName), "AzureServiceBus Connection Name");

    };

    this.setEntityType = function (EntityType) {

        //browser.sleep(1000);
        utilities.clickElement(PaletteElements.EntitySelect(), "AzureServiceBus EntitySelection List");
        //browser.sleep(1000);
        browser.wait(EC.presenceOf(PaletteElements.EntitySelectValue(EntityType)), 10000);
        utilities.clickElement(PaletteElements.EntitySelectValue(EntityType), "AzureServiceBus Connection Name");

    };

     //Scroll the page up to find + (add activity) button
    this.scrollPage = function (){
        browser.executeScript('window.scrollTo(0,200);').then(function () {
            browser.sleep(1000);
        }).then(function () {
            browser.executeScript('window.scrollTo(0,0);');
        });
    };

    /**
     * Sets the AzureServiceBus Object as per the given parameter.
     * @param objectName
     */
    this.setObjectName = function (objectName) {

        //browser.sleep(500);
        utilities.clickElement(PaletteElements.EntitySelect(), "AzureServiceBus Entity Name List");
        //browser.sleep(500);
        browser.wait(EC.presenceOf(PaletteElements.EntitySelectValue(objectName)), 10000);
        utilities.clickElement(PaletteElements.EntitySelectValue(objectName), "SugarCRM Object Name is " + objectName);

    };


    this.configureAzureActivity = function (connectionName, objectName) {
        this.setConnectionName(connectionName);
        browser.sleep(500);
        this.setObjectName(objectName);

    };


    this.clickTopicSubscriberTrigger = function () {
        utilities.clickElement(AzureServiceBusPublishModalElements.topicSubscriberTrigger(), "clicking on TopicSubscriber");
    };

    this.clickQueueRecieverTrigger = function () {
        utilities.clickElement(AzureServiceBusPublishModalElements.queueRecieverTrigger(), "clicking on QueueReciever");
    };


    /**
     * Clicks on the Input tab.
     */
    this.clickInputTab = function () {
        utilities.clickElement(PaletteElements.inputTabspublish(), "Input tab sugarCRM");
    }


};
module.exports = new PaletteMethods();