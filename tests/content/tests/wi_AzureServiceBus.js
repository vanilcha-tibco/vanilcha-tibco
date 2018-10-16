/**
 * Created by KrishnaChaitanyaGuttikonda on 10/25/17.
 */

var baseAzureServiceBus = require('./../baseAzureServiceBus.js');
var azureServiceBusConnection = baseAzureServiceBus.connectionDetails;
var azureServiceBusSettings = baseAzureServiceBus.connectorsConfig;
var baseWI = azureServiceBusSettings.baseWI;
var logger = baseAzureServiceBus.connectorsConfig.loggerFile;

describe("Flogo AzureServiceBus", function () {

    beforeAll(function () {
        baseWI.deleteAllApps();
        //baseWI.deleteConnections(['AzureServiceBusConnection', 'testsalesforce', 'testMarketo', 'second_connection', 'sfConn1', 'edited_sf_conn', 'SQS Extensions', 'testSugarCRM', 'testZuora', 'testTcm']);

    });

    it("UC1 - App with one TopicSubscriber , Queue Reciever and a PublishActivity", function () {

        //Declare and initialize variables
        var appName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowDescription = baseWI.commonMethods().generateRandomStringOfNCharacters(20);

        browser.sleep(10000);
        //baseAzureServiceBus.connectionModalMethods().addServiceBusConnection("AzureServiceBusConnection","Tibco Azure Service Bus Connection","ServicebusQA001","AuthRule","eFxVfMG/8ssXCmm9BQFuEymrVnYpFvJWTxkr0nuXPQw=");
        //baseAzureServiceBus.connectionModalMethods().addConnection();
        browser.sleep(5000);


        baseWI.createWIApp(appName);

        var queueNameValue = "\"flogoqueue4\"";
        var topicNameValue = "\"flogotopic4\"";
        var messageStringValueTopic = "\"MessageinTopic\"";
        var messageStringValueQueue = "\"MessageinQueue\"";


        var queueName = "queueName";
        var topicName = "topicName";
        var mesageString = "messageString";







        baseWI.createAzureTopicSubscriber("AzureTopicSubscriber","AzureTopicSubscriberdescription","AzureServiceBusConnection","flogotopic4","test1");
        baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TopicSubscriber);
        var logMessage = 'string.concat("TopicSubscriberMessage:",$flow.output.messageString)';
        baseWI.addAndConfigureLogMessage(baseWI.commonElements().activityType.TopicSubscriber,logMessage,baseWI.logMessageMethods().logLevelType.Info);
        //baseWI.addAndConfigureLogMessage2("AzureServiceBusTopicSubscriber",logMessage, baseWI.commonElements().logLevelType.Info);
        browser.sleep(3000);
        baseWI.appImplementationPageMethods().clickBackButton();
        browser.sleep(6000);
        baseWI.createAzureQueueReciever("AzureQueueReceiverSubscriber","AzureQueueReceiverdescription","AzureServiceBusConnection","flogoqueue4");
        baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.QueueReceiver);
        var logMessage = 'string.concat("QueueReceiverMessage:",$flow.output.messageString)';
        baseWI.addAndConfigureLogMessage(baseWI.commonElements().activityType.QueueReceiver,logMessage,baseWI.logMessageMethods().logLevelType.Info);
        //baseWI.addAndConfigureLogMessage2("AzureServiceBusTopicSubscriber",logMessage, baseWI.commonElements().logLevelType.Info);
        browser.sleep(3000);
        baseWI.appImplementationPageMethods().clickBackButton();
        baseWI.pushAppAndVerify(appName);
        baseWI.appsHomePageMethods().navigateToApp(appName);
        browser.sleep(1000);



        //Create Timer Flow with two publish activities
        baseWI.createTimerFlow("PublishActivities","PublishActivities with Topic and Queue");
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.TimerTrigger);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("azureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Queue");
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(1000);
        baseWI.commonActivityMethods().expandSchema(2);
        browser.sleep(1000);
        baseWI.commonActivityMethods().mapperInput(queueName, queueNameValue);
        baseWI.commonActivityMethods().mapperInput(mesageString, messageStringValueQueue);
        console.debug("completed entering QueueName");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("azureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Topic");
        browser.sleep(2000);
        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(1000);
        baseWI.commonActivityMethods().expandSchema(2);
        browser.sleep(1000);
        baseWI.commonActivityMethods().mapperInput(topicName, topicNameValue);
        baseWI.commonActivityMethods().mapperInput(mesageString, messageStringValueTopic);
        console.debug("completed entering Topic");
        browser.sleep(2000);
        var logMessage = 'string.concat(string.concat("QueueMessageOnPublish:",$activity[AzureServiceBusPublish].output.responseMessage),string.concat("TopicMessageOnPublish:",$activity[AzureServiceBusPublish1].output.responseMessage))';
        baseWI.addAndConfigureLogMessage(baseWI.commonElements().activityType.AzureServiceBusPublish1,logMessage,baseWI.logMessageMethods().logLevelType.Info);
        browser.sleep(2000);
        baseWI.appImplementationPageMethods().clickBackButton();
        baseWI.pushAppAndVerify(appName);
        baseWI.appsHomePageMethods().navigateToApp(appName);
        browser.sleep(1000);

        baseWI.appImplementationPageMethods().clickLogTab();
        browser.findElement(by.id('tropos-interval-custom')).click();
        browser.sleep(2000);

        var TopicSubscriberMessage = "TopicSubscriberMessage:MessageinTopic";
        var QueueSubscriberMessage = "QueueRecieverMessage:MessageinQueue";
        var PublishMessage = "QueueMessageOnPublish: /Published message to Queue : flogoqueue4 successfully / TopicMessageOnPublish: /Published message to Topic : flogotopic4 successfully /";

        baseWI.checkTextInLogs(TopicSubscriberMessage);
        baseWI.checkTextInLogs(QueueSubscriberMessage);
        baseWI.checkTextInLogs(PublishMessage);

    });
});

