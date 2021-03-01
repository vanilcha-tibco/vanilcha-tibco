/**
 * Created by yokarale on 06/10/2020.
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
var connectionDetails =  baseAzureServiceBus.connectionDetails;
var path = require('path');


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


    it("UC1 - Create App with one TopicSubscriber , Queue Reciever and a PublishActivity  Export > delete app and connections > import back > edit imported connection > verify output", function () {

        //Declare and initialize variables
        var appName = "Azservicebus_export_test"
        var flowName = baseWI.commonMethods().generateRandomStringOfNCharacters(8);
        var flowDescription = baseWI.commonMethods().generateRandomStringOfNCharacters(20);
        var basePath = ["azservicebus"];
        var pathParam = ["message"];
        var methods = ["GET"];
        var inputData ='{"output":"string" }';

        var cwd = process.cwd();
        log.debug(cwd);

        var Directory = cwd+"/WI/downloads/";
        log.debug(Directory);
        var exported_app = Directory + appName + ".json";
        var pathToApp = path.resolve(__dirname,exported_app);

        //Create azservicebus Connection

        browser.sleep(500);
        baseAzureServiceBus.connectionModalMethods().addConnection();
        browser.sleep(500);

       //==================Create a new flow with AzureTopicSubscriber========================
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

        var logMessage2 = 'string.concat("TopicSubscriberOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        baseWI.addAndConfigureLogMessage("non_rest_trigger", logMessage2, baseWI.logMessageMethods().logLevelType.Info);

        logger.info(logMessage2);

        browser.sleep(500);
        baseWI.appImplementationPageMethods().clickBackButton();

        //==================Create a new flow with AzureQueueRecieverSubscriber========================

        baseAzureServiceBus.AzureServiceBusPaletteMethods().createAzureQueueReciever("AzureQueueReceiverSubscriber","AzureQueueReceiverdescription","AzureServiceBusConnection","queueauto","sessionautoqueue");
        //browser.driver.findElement(by.xpath("//div[contains(@data-flogo-node-type, 'node_add')]")).click();
        browser.sleep(500);
        //baseWI.flowDesignPageMethods().addNewActivity(baseWI.commonElements().activityType.LogMessage);
        var logMessage1 = 'string.concat("QueueReceiverOutput: ", utility.renderJSON($flow.output,boolean.true()))';
        //var logMessage1= 'string.concat("QueueReceiverOutput: ",$flow.output';
        baseWI.addAndConfigureLogMessage("non_rest_trigger", logMessage1, baseWI.logMessageMethods().logLevelType.Info);

        //baseAzureServiceBus.AzureServiceBusPaletteMethods().addAndConfigureLogMessage(logMessage1, baseWI.logMessageMethods().logLevelType.Info,"Trigger");
        logger.info(logMessage1);
        browser.sleep(500);
        baseWI.appImplementationPageMethods().clickBackButton();





        //===============Create REST Flow with two publish activities===============

        baseWI.createRESTFlow(flowName, flowDescription, basePath[0], pathParam[0], methods, inputData);

        var outputSettings = [[]];
        var output = ["pathParam.message"];
        var replySettings = inputData;
        var reply = ["output"];
        baseWI.configureServerlessRestTrigger(outputSettings, output, replySettings, reply);


        baseAzureServiceBus.AzureServiceBusPaletteMethods().addAzureServiceBusPublishActivity(baseWI.commonElements().activityType.AzureServiceBusPublish);
        //baseWI.flowDesignPageMethods().selectActivityTypeFromPallet(baseWI.commonElements().activityType.AzureServiceBusPublish);

        baseAzureServiceBus.AzureServiceBusPaletteMethods().setConnectionName("AzureServiceBusConnection");
        baseAzureServiceBus.AzureServiceBusPaletteMethods().setEntityType("Queue");

        baseAzureServiceBus.AzureServiceBusPaletteMethods().clickInputTab();
        browser.sleep(500);

        baseWI.commonActivityMethods().expandSchema(3);
        browser.sleep(500);
        baseWI.commonActivityMethods().mapperInput(queueName, queueNameValue);
        browser.sleep(500);
        baseWI.commonActivityMethods().mapperInput(messageString, messageStringValueQueue);
        browser.sleep(500);
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

        //Configure ReplyToHttpMessage
        var inputMapperReplyKeys = ['output'];
        var inputMapperReplyValues = ['string.concat(string.concat("QueueMessageOnPublish:",$activity[AzureServiceBusPublish].output.responseMessage),string.concat("TopicMessageOnPublish:",$activity[AzureServiceBusPublish1].output.responseMessage))'];
        var returnSchema = [inputMapperReplyKeys, inputMapperReplyValues];
        //baseAzureServiceBus.AzureServiceBusPaletteMethods().scrollPage();
        baseWI.addAndConfigureReturnActivity("LogMessage", returnSchema, 0);
        browser.sleep(3000);

       //===============Export this flow=========
        baseWI.appImplementationPageMethods().clickBackButton();
        browser.sleep(1000);
        baseWI.appImplementationPageMethods().clickExportAppButton();
        browser.sleep(2500);
        //delete apps and connections
        baseWI.deleteAllApps();
        browser.sleep(500);

        baseWI.deleteAllConnections();

        //==============Import the flow and edit imported connectoin

        var appName1 = "azservicebus_import_test"
        baseWI.createWIApp(appName1);

        baseWI.appImplementationPageMethods().clickImportAppButton();
        baseWI.appImplementationPageElements().inputFile().sendKeys(pathToApp);
        baseWI.appImplementationPageMethods().clickUploadButton();

        browser.sleep(3000);
        baseAzureServiceBus.connectionModalMethods().editConnection(connectionDetails.name);
        browser.sleep(5000);

        //========================================================

        baseAzureServiceBus.AzureServiceBusPaletteMethods().scrollPage();
        baseWI.appsHomePageMethods().navigateToApp(appName1);
        baseWI.pushAppAndVerify(appName1);
        //baseWI.appsHomePageMethods().navigateToApp(appName1);
        browser.sleep(3000);



        if (isFlogoEnterpriseEnabled != 'true') {
            //baseWI.appsHomePageMethods().navigateToApp(appName);
            //browser.sleep(500);
            //baseWI.appImplementationPageMethods().clickLogTab();
            //baseWI.navigateToApiTester(appName);baseWI.navigateToLogs(appName);//commented out by yokarale for tci-2.0

            baseWI.navigateToApiTester(appName1);
            browser.sleep(2000);



            //TEST GET METHOD IN API TESTER PAGE
            var pathParamNameAndValue = [[pathParam[0]], ["message"]];
            var responseCodeAndResults = [200, [baseWI.utilities().readFile("../../../connectors/azservicebus/content/testdata/azservicebusTCI_output")]];
            log.debug("after navigate ToApiTester");
            baseWI.verifyResultsInApiTester(methods[0], basePath, pathParamNameAndValue, responseCodeAndResults, 0, 1);
            log.debug("after verify result in api tester");
            browser.sleep(1000);



        }
        else {
            appNames = appName1;
            appNameToVerify = appName1;
            logMessages = [];
            verifyEndpoints = true;
            endpoints = [];
            var response = baseWI.utilities().readFile("../../../connectors/azservicebus/content/testdata/azservicebusFE_output");

            var requestParams_req1 = {
                "method": methods[0], "pathParamName": basePath, "pathParamValue": "message",
                "queryParams": {},
                "headerParams": {},
                //"inputData": '1',
                "expectedResponse": response
            };

            var endpoint1 = [requestParams_req1.method, requestParams_req1.pathParamName, requestParams_req1.pathParamValue,
                requestParams_req1.queryParams, requestParams_req1.headerParams, requestParams_req1.expectedResponse];
            endpoints.push(endpoint1);
        }


    });
});