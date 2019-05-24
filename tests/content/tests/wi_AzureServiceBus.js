/**
 * Created by KrishnaChaitanyaGuttikonda on 10/25/17.
 */
var baseAzureServiceBus = require('./../baseAzureServiceBus.js');
var azureServiceBusConnection = baseAzureServiceBus.connectionDetails;
var azureServiceBusSettings = baseAzureServiceBus.connectorsConfig;
var baseWI = azureServiceBusSettings.baseWI;
var logger = baseAzureServiceBus.connectorsConfig.loggerFile;

describe("Flogo AzureServiceBus", function () {

    /*beforeAll(function () {
        baseWI.deleteAllApps();
        baseWI.deleteConnections('AzureServiceBusConnection');

    });*/


    it("UC1 - App with one TopicSubscriber , Queue Reciever and a PublishActivity", function () {

        //Declare and initialize variables
        var appName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowDescription = baseWI.commonMethods().generateRandomStringOfNCharacters(20);

        browser.sleep(10000);
        baseAzureServiceBus.connectionModalMethods().addConnection();
        browser.sleep(5000);


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
        baseWI.addAndConfigureLogMessage("non_rest_trigger", 'string.concat("TCM Receiver Msg: ", $flow.tcm_msg)', baseWI.logMessageMethods().logLevelType.Info);

        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage2 = 'string.concat("TopicSubscriberOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        //var logMessage2= 'string.concat("TopicSubscriberOutput: ",$flow.output';
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage2, baseWI.logMessageMethods().logLevelType.Info,"Trigger");
        logger.info(logMessage2);


        browser.sleep(3000);
        baseWI.appImplementationPageMethods().clickBackButton();
        browser.sleep(6000);



        baseAzureServiceBus.AzureServiceBusPaletteMethods().createAzureQueueReciever("AzureQueueReceiverSubscriber","AzureQueueReceiverdescription","AzureServiceBusConnection","queueauto","sessionautoqueue");
        //browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        browser.sleep(1000);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage1 = 'string.concat("QueueReceiverOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        //var logMessage1= 'string.concat("QueueReceiverOutput: ",$flow.output';
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage1, baseWI.logMessageMethods().logLevelType.Info,"Trigger");
        logger.info(logMessage1);


        browser.sleep(3000);
        baseWI.appImplementationPageMethods().clickBackButton();
        //baseWI.pushAppAndVerify(appName);
        //baseWI.appsHomePageMethods().navigateToApp(appName);
        browser.sleep(1000);



        //Create Timer Flow with two publish activities
        baseWI.createTimerFlow("PublishActivities","PublishActivities with Topic and Queue");
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Queue");
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(1000);
        baseWI.commonActivityMethods().expandSchema(3);
        browser.sleep(1000);
        baseWI.commonActivityMethods().mapperInput(queueName, queueNameValue);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueQueue);
        browser.sleep(1000);
        baseWI.commonActivityMethods().mapperInput(sessionId, sessionIdValueQueue);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity("AzureServiceBus Publish");
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Topic");
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(1000);
        baseWI.commonActivityMethods().expandSchema(3);
        browser.sleep(1000);
        baseWI.commonActivityMethods().mapperInput(topicName, topicNameValue);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueTopic);
        browser.sleep(2000);
        baseWI.commonActivityMethods().mapperInput(sessionId, sessionIdValueTopic);
        var logMessage = 'string.concat(string.concat("QueueMessageOnPublish:",$activity[AzureServiceBusPublish].output.responseMessage),string.concat("TopicMessageOnPublish:",$activity[AzureServiceBusPublish1].output.responseMessage))';

        //baseWI.addAndConfigureLogMessage("AzureServiceBusPublish1",logMessage, baseWI.commonElements().logLevelType.Info);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage, baseWI.logMessageMethods().logLevelType.Info,"AzureServiceBusPublish1");
        browser.sleep(2000);
        baseWI.appImplementationPageMethods().clickBackButton();
        baseWI.pushAppAndVerify(appName);
        baseWI.appsHomePageMethods().navigateToApp(appName);
        browser.sleep(1000);

        baseWI.appImplementationPageMethods().clickLogTab();
        browser.findElement(by.id('tropos-interval-custom')).click();
        browser.sleep(2000);

        var TopicSubscriberMessage = "TopicSubscriberOutput: ";
        var QueueSubscriberMessage = "QueueRecieverOutput: ";
        //var PublishMessage = "QueueMessageOnPublish: /Published message to Queue : queueauto successfully / TopicMessageOnPublish: /Published message to Topic : topicauto successfully /";

        baseWI.checkTextInLogs(TopicSubscriberMessage);
        baseWI.checkTextInLogs(QueueSubscriberMessage);
        baseWI.checkTextInLogs(messageStringValueTopic);
        baseWI.checkTextInLogs(messageStringValueQueue);
        baseWI.checkTextInLogs(sessionIdValueQueue);
        baseWI.checkTextInLogs(sessionIdValueTopic);

    });
});

