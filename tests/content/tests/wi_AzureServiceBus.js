/**
 * Created by KrishnaChaitanyaGuttikonda on 10/25/17.
 * Modified in tci 2.0 release by yokarale on 06/10/2020
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
        baseWI.deleteAllConnections();

    });

    afterAll(function () {
        baseWI.deleteAllApps();
        baseWI.deleteAllConnections();

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


    it("UC1 - App with one TopicSubscriber , Queue Reciever and a PublishActivity", function () {

        //Declare and initialize variables
        var appName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowDescription = baseWI.commonMethods().generateRandomStringOfNCharacters(20);

        browser.sleep(500);
        baseAzureServiceBus.connectionModalMethods().addConnection();
        browser.sleep(1000);


        baseWI.createWIApp(appName);

        var queueNameValue = "\"queueauto\"";
        var topicNameValue = "\"topicauto\"";
        var messageStringValueTopic = "\"MessageinTopic\"";
        var messageStringValueQueue = "\"MessageinQueue\"";
        var sessionIdValueQueue = "\"sessionautoqueue\"";
        var sessionIdValueTopic = "\"sessionautotopic\"";

        var queueName = "queueName";
        var topicName = "topicName";
        var messageString = "messageString";
        var sessionId = "SessionId";


        baseAzureServiceBus.AzureServiceBusPaletteMethods().createAzureTopicSubscriber("AzureTopicSubscriber","AzureTopicSubscriberdescription","AzureServiceBusConnection","topicauto","subauto","sessionautotopic");
        //browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        //baseWI.addAndConfigureLogMessage("non_rest_trigger", 'string.concat("TCM Receiver Msg: ", $flow.tcm_msg)', baseWI.logMessageMethods().logLevelType.Info);

        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage2 = 'string.concat("TopicSubscriberOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        baseWI.addAndConfigureLogMessage("non_rest_trigger", logMessage2, baseWI.logMessageMethods().logLevelType.Info);

        //baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage2, baseWI.logMessageMethods().logLevelType.Info,"Trigger");
        logger.info(logMessage2);


        browser.sleep(500);
        baseWI.appImplementationPageMethods().clickBackButton();


        baseAzureServiceBus.AzureServiceBusPaletteMethods().createAzureQueueReciever("AzureQueueReceiverSubscriber","AzureQueueReceiverdescription","AzureServiceBusConnection","queueauto","sessionautoqueue");
        //browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        browser.sleep(500);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage1 = 'string.concat("QueueReceiverOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        //var logMessage1= 'string.concat("QueueReceiverOutput: ",$flow.output';
        baseWI.addAndConfigureLogMessage("non_rest_trigger", logMessage1, baseWI.logMessageMethods().logLevelType.Info);

        //baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage1, baseWI.logMessageMethods().logLevelType.Info,"Trigger");
        logger.info(logMessage1);


        baseWI.appImplementationPageMethods().clickBackButton();
        //baseWI.pushAppAndVerify(appName);
        //baseWI.appsHomePageMethods().navigateToApp(appName);
        browser.sleep(500);



        //Create Timer Flow with two publish activities
        baseWI.createTimerFlow("PublishActivities","PublishActivities with Topic and Queue");
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Queue");

        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();

        baseWI.commonActivityMethods().expandSchema(3);

        baseWI.commonActivityMethods().mapperInput(queueName, queueNameValue);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueQueue);

        baseWI.commonActivityMethods().mapperInput(sessionId, sessionIdValueQueue);
        browser.sleep(500);
        baseWI.commonActivityMethods().clickCloseActivityConfiguration();
        browser.sleep(500);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity("AzureServiceBus Publish");
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        browser.sleep(500);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Topic");
        browser.sleep(500);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(500);
        baseWI.commonActivityMethods().expandSchema(3);
        browser.sleep(500);
        baseWI.commonActivityMethods().mapperInput(topicName, topicNameValue);
        browser.sleep(500);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueTopic);
        browser.sleep(500);

        baseWI.commonActivityMethods().mapperInput(sessionId, sessionIdValueTopic);
        console.log("Before click CLose Activity COnfiguration");
        browser.sleep(500);
        baseWI.commonActivityMethods().clickCloseActivityConfiguration();



        var logMessage = 'string.concat(string.concat("QueueMessageOnPublish:",$activity[AzureServiceBusPublish].output.responseMessage),string.concat("TopicMessageOnPublish:",$activity[AzureServiceBusPublish1].output.responseMessage))';

        baseWI.addAndConfigureLogMessage("AzureServiceBusPublish1",logMessage, baseWI.commonElements().logLevelType.Info);
        //baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage, baseWI.logMessageMethods().logLevelType.Info,"AzureServiceBusPublish1");

       // baseWI.appImplementationPageMethods().clickBackButton();//commented for yogini for tci-2.0
        baseWI.pushAppAndVerify(appName);
        browser.sleep(5000);

        //baseWI.navigateToApiTester(appName);

        var TopicSubscriberMessage = "TopicSubscriberOutput: ";
        var QueueSubscriberMessage = "QueueReceiverOutput: ";
        //var PublishMessage = "QueueMessageOnPublish: /Published message to Queue : queueauto successfully / TopicMessageOnPublish: /Published message to Topic : topicauto successfully /";

        if (isFlogoEnterpriseEnabled != 'true') {
            //baseWI.appsHomePageMethods().navigateToApp(appName);
            //browser.sleep(500);
            //baseWI.appImplementationPageMethods().clickLogTab();
            //baseWI.navigateToApiTester(appName);baseWI.navigateToLogs(appName);//commented out by yokarale for tci-2.0

            baseWI.navigateToLogs(appName);


            //browser.findElement(by.id('tropos-interval-custom')).click();
            browser.sleep(3000);
            baseWI.checkTextInLogs(TopicSubscriberMessage);
            baseWI.checkTextInLogs(QueueSubscriberMessage);
            baseWI.checkTextInLogs(messageStringValueTopic);
            baseWI.checkTextInLogs(messageStringValueQueue);
            baseWI.checkTextInLogs(sessionIdValueQueue);
            baseWI.checkTextInLogs(sessionIdValueTopic);
        }
        else {
            appNames = appName;
            appNameToVerify = appName;
            logMessages = [];
            verifyEndpoints = false;
            endpoints = [];

            logMessages.push(TopicSubscriberMessage);
            logMessages.push(QueueSubscriberMessage);
            logMessages.push(messageStringValueTopic);
            logMessages.push(messageStringValueQueue);
            logMessages.push(sessionIdValueQueue);
            logMessages.push(sessionIdValueTopic);
        }




    });
});