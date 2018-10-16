var connectionModalMethods = function () {
    var connectionModalElements = require('./connectionModalElements.js');
    var azureservicebusSettings = require('./../../baseAzureServiceBus.js');
    var utilities = azureservicebusSettings.connectorsConfig.utilitiesFile;
    var loggerFile = azureservicebusSettings.connectorsConfig.loggerFile;
    var timeOutDuration = azureservicebusSettings.connectorsConfig.settings.timeOutDuration;
    var baseWI = azureservicebusSettings.connectorsConfig.baseWI;
    var connectionDetails = azureservicebusSettings.connectionDetails;
    var consecutiveConnectionDetails = azureservicebusSettings.consecutiveConnectionDetails;
    var dummyZuoraConnection = azureservicebusSettings.dummyZuoraConnection;
    var EC = protractor.ExpectedConditions;

    this.clickAzureServiceBusConnection = function () {
        browser.wait(EC.visibilityOf(connectionModalElements.AzureServiceBusConnection()), 10000);
        browser.sleep(3000);
        utilities.clickElement(connectionModalElements.AzureServiceBusConnection(), "Click on AzureServiceBus connection");

    };

    this.setAzureServiceBusConnectionName = function (AzureServiceBusConnectionName) {
        console.log("Im in set connection name");
        console.log(AzureServiceBusConnectionName);
        browser.sleep(1000);
        element(by.xpath("//input[@id='name']")).click();
        utilities.enterText(connectionModalElements.AzureServiceBusConnectionName(), AzureServiceBusConnectionName, "AzureServiceBus Connection Name ");
    };

    /**
     * Sets the AzureServiceBus Connection Description text box to the given value.
     * @param AzureServiceBusonnectionDescription
     */
    this.setAzureServiceBusConnectionDescription = function (AzureServiceBusDescription) {
        element(by.xpath("//input[@id='description']")).click();
        utilities.enterText(connectionModalElements.AzureServiceBusConnectionDescription(), AzureServiceBusDescription, "AzureServiceBus Connection Name Description");
    };

    /**
     * Sets the AzureServiceBus Connection URL text box to the given value.
     * @param AzureServiceBusConnectionDescription
     */
    this.setAzureServiceBusNamespace = function (AzureServiceBusNamespace) {
        utilities.enterText(connectionModalElements.AzureServiceBusNamespace(), AzureServiceBusNamespace, "AzureServiceBus Namespace");
    };

    /**
     * Sets the AzureServiceBus username text box to the given value.
     * @param AzureServiceBusConnectionAuthRule
     */
    this.setAzureServiceBusAuthRule = function (AzureServiceBusAuthRule) {
        utilities.enterText(connectionModalElements.AzureServiceBusAuthRule(), AzureServiceBusAuthRule);
    };

    /**
     * Sets the AzureServiceBus Key text box to the given value.
     * @param AzureServiceBusConnectionKey
     */
    this.setAzureServiceBusKey = function (AzureServiceBusKey) {
        utilities.enterText(connectionModalElements.AzureServiceBusKey(), AzureServiceBusKey);
    };
    /**
     * Use this to click on AzureServiceBus Save Connection Button.
     */
    this.clickAzureServiceBusConnectionButton = function () {
        utilities.clickElement(connectionModalElements.AzureServiceBusLoginConnectionButton(), "Click on AzureServiceBus Save Connection Button");
    };

    this.clickAzureServiceBusConnection = function () {
        browser.wait(EC.visibilityOf(connectionModalElements.AzureServiceBusConnection()),10000);
        browser.sleep(3000);
        utilities.clickElement(connectionModalElements.AzureServiceBusConnection(),"Click on AzureServiceBus connection");

    };

    this.setAzureServiceBusConnectionName = function (AzureServiceBusConnectionName) {
        console.log("Im in set connection name");
        console.log(AzureServiceBusConnectionName);
        browser.sleep(1000);
        element(by.xpath("//input[@id='name']")).click();
        utilities.enterText(connectionModalElements.AzureServiceBusConnectionName(), AzureServiceBusConnectionName, "AzureServiceBus Connection Name ");
    };

    /**
     * Sets the AzureServiceBus Connection Description text box to the given value.
     * @param AzureServiceBusonnectionDescription
     */
    this.setAzureServiceBusConnectionDescription = function (AzureServiceBusDescription) {
        element(by.xpath("//input[@id='description']")).click();
        utilities.enterText(connectionModalElements.AzureServiceBusConnectionDescription(), AzureServiceBusDescription, "AzureServiceBus Connection Name Description");
    };

    /**
     * Sets the AzureServiceBus Connection URL text box to the given value.
     * @param AzureServiceBusConnectionDescription
     */
    this.setAzureServiceBusNamespace = function (AzureServiceBusNamespace) {
        utilities.enterText(connectionModalElements.AzureServiceBusNamespace(), AzureServiceBusNamespace, "AzureServiceBus Namespace");
    };

    /**
     * Sets the AzureServiceBus username text box to the given value.
     * @param AzureServiceBusConnectionAuthRule
     */
    this.setAzureServiceBusAuthRule = function (AzureServiceBusAuthRule) {
        utilities.enterText(connectionModalElements.AzureServiceBusAuthRule(), AzureServiceBusAuthRule);
    };

    /**
     * Sets the AzureServiceBus Key text box to the given value.
     * @param AzureServiceBusConnectionKey
     */
    this.setAzureServiceBusKey = function (AzureServiceBusKey) {
        utilities.enterText(connectionModalElements.AzureServiceBusKey(), AzureServiceBusKey);
    };
    /**
     * Use this to click on AzureServiceBus Save Connection Button.
     */
    this.clickAzureServiceBusConnectionButton = function () {
        utilities.clickElement(connectionModalElements.AzureServiceBusLoginConnectionButton(), "Click on AzureServiceBus Save Connection Button");
    };



    this.addConnection = function (checkSymbolForConnection) {
        checkSymbolForConnection = checkSymbolForConnection || true;
        loggerFile.debug("Adding Azure Service Bus Connection");
        baseWI.connectionsHomePageMethods().clickConnectionsTab();
        browser.sleep(40000);
        //browser.wait(EC.or(EC.visibilityOf(baseWI.connectionsHomePageElements().addANewConnectionText()),
        //EC.visibilityOf(baseWI.connectionsHomePageElements().addConnectionsButton())), 50000);
        var that = this;
        baseWI.connectionsHomePageElements().createdConnection(connectionDetails.name).isPresent().then(function (isPre) {

            if (isPre) {
                log.debug("Azure ServiceBus connection " + connectionDetails.name + " is already present");
            }
            else {
                baseWI.connectionsHomePageElements().addConnectionsButton().isPresent().then(function (isDisplayed) {
                    if (isDisplayed) {
                        baseWI.connectionsHomePageMethods().clickaddConnectionsButton();
                    }
                    log.debug("before clicking AzureServiceBus Connection");
                    that.clickAzureServiceBusConnection();
                    log.debug("before setting connection name");
                    that.setAzureServiceBusConnectionName(connectionDetails.name);
                    that.setAzureServiceBusConnectionDescription(connectionDetails.description);
                    that.setAzureServiceBusAuthRule(connectionDetails.azureservicebusAuthRule);
                    that.setAzureServiceBusNamespace(connectionDetails.azureservicebusNameSpace);
                    that.setAzureServiceBusKey(connectionDetails.azureservicebusKey);
                    that.clickAzureServiceBusConnectionButton();
                    browser.sleep(5000);
                    browser.wait(EC.visibilityOf(baseWI.connectionsHomePageElements().createdConnection(connectionDetails.name)), timeOutDuration.Long);
                    if (checkSymbolForConnection) {
                        browser.sleep(2000);
                        expect(baseWI.connectionsHomePageMethods().checkSymbolForConnection(connectionDetails.name)).toBe(true);
                    }
                });
            }
        });

    };

};
module.exports = new connectionModalMethods();