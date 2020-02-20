/**
 * Created by Prerna Dogra on 27/11/2019.
 */
var baseAzureServiceBus = require('./../baseAzureServiceBus.js');
var azureServiceBusConnection = baseAzureServiceBus.connectionDetails;
var azureServiceBusSettings = baseAzureServiceBus.connectorsConfig;
var baseWI = azureServiceBusSettings.baseWI;
var logger = baseAzureServiceBus.connectorsConfig.loggerFile;
var baseFE = azureServiceBusSettings.baseFE;
var isFlogoEnterpriseEnabled = azureServiceBusSettings.settings.testingMode.isFlogoEnterpriseEnabled;
var appTarget = azureServiceBusSettings.settings.appTarget;
var dockerPort = azureServiceBusSettings.settings.dockerPort;


describe("Flogo AzureServiceBus", function () {
    var appNameToVerify = "";
    var verifyEndpoints = false;
    var endpoints = null;
    var logMessages = [];
    var appNames = "";

    beforeAll(function () {
        baseWI.deleteAllApps();
        baseWI.deleteConnections('AzureServiceBusConnection');

    });

    afterAll(function () {
        baseWI.deleteAllApps();
        baseWI.deleteConnections('AzureServiceBusConnection');

    });

    afterEach(function () {
        if (isFlogoEnterpriseEnabled == 'true') {
            baseFE.flogoEnterpriseMethods().startApps(appNames, appTarget, dockerPort,25);
            if (verifyEndpoints) {
                baseFE.flogoEnterpriseMethods().verifyEndpoints(endpoints);
            }
            baseFE.flogoEnterpriseMethods().verifyLogs(appNameToVerify, logMessages);
            baseFE.flogoEnterpriseMethods().stopApps(appNames, appTarget);
            logMessages = [];
            endpoints = [];
            appNames = null;
            appNameToVerify = null;
            baseWI.deleteAllApps();
            baseFE.flogoEnterpriseMethods().cleanupTargetArtifacts();
        }
    });


    it("UC1 - Smoke test App with one Queue Reciever and a PublishActivity", function () {

        //Declare and initialize variables
        var appName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowDescription = baseWI.commonMethods().generateRandomStringOfNCharacters(20);

        browser.sleep(500);
        baseAzureServiceBus.connectionModalMethods().addConnection();
        browser.sleep(500);


        baseWI.createWIApp(appName);

        var queueNameValue = "\"queueauto\"";
        var messageStringValueQueue = "\"MessageinQueue\"";
        var sessionIdValueQueue = "\"sessionautoqueue\"";

        var queueName = "queueName";
        var messageString = "messageString";
        var sessionId = "SessionId";


        baseAzureServiceBus.AzureServiceBusPaletteMethods().createAzureQueueReciever("AzureQueueReceiverSubscriber","AzureQueueReceiverdescription","AzureServiceBusConnection","queueauto","sessionautoqueue");
        //browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        browser.sleep(500);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage1 = 'string.concat("QueueReceiverOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        //var logMessage1= 'string.concat("QueueReceiverOutput: ",$flow.output';
        baseWI.addAndConfigureLogMessage("non_rest_trigger", logMessage1, baseWI.logMessageMethods().logLevelType.Info);

        logger.info(logMessage1);


        baseWI.appImplementationPageMethods().clickBackButton();

        browser.sleep(500);



        //Create Timer Flow with publish activity
        baseWI.createTimerFlow("PublishActivity","PublishActivity with Queue");

        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Queue");

        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();

        baseWI.commonActivityMethods().expandSchema(3);

        baseWI.commonActivityMethods().mapperInput(queueName, queueNameValue);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueQueue);

        baseWI.commonActivityMethods().mapperInput(sessionId, sessionIdValueQueue);
        baseWI.commonActivityMethods().clickCloseActivityConfiguration();

        var logMessage = 'string.concat("QueueMessageOnPublish:",$activity[AzureServiceBusPublish].output.responseMessage)';

        baseWI.addAndConfigureLogMessage("AzureServiceBusPublish",logMessage, baseWI.commonElements().logLevelType.Info);

        baseWI.appImplementationPageMethods().clickBackButton();
        baseWI.pushAppAndVerify(appName);

        var QueueSubscriberMessage = "QueueReceiverOutput: ";

        if (isFlogoEnterpriseEnabled != 'true') {
            baseWI.appsHomePageMethods().navigateToApp(appName);
            browser.sleep(500);
            baseWI.appImplementationPageMethods().clickLogTab();
            browser.findElement(by.id('tropos-interval-custom')).click();
            baseWI.checkTextInLogs(QueueSubscriberMessage);
            baseWI.checkTextInLogs(messageStringValueQueue);
            baseWI.checkTextInLogs(sessionIdValueQueue);
        }
        else {
            appNames = appName;
            appNameToVerify = appName;
            logMessages = [];
            verifyEndpoints = false;
            endpoints = [];


            logMessages.push(QueueSubscriberMessage);

            logMessages.push(messageStringValueQueue);
            logMessages.push(sessionIdValueQueue);

        }




    });
});