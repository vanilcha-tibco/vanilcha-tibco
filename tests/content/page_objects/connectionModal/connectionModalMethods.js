var connectionModalMethods = function () {
    var connectionModalElements = require('./connectionModalElements.js');
    var azureservicebusSettings = require('./../../baseAzureServiceBus.js');
    var TCI = require('../../../../../Webserver/pageobjects/index.js');
    var utilities = azureservicebusSettings.connectorsConfig.utilitiesFile;
    var loggerFile = azureservicebusSettings.connectorsConfig.loggerFile;
    var timeOutDuration = azureservicebusSettings.connectorsConfig.settings.timeOutDuration;
    var baseWI = azureservicebusSettings.connectorsConfig.baseWI;
    var connectionDetails = azureservicebusSettings.connectionDetails;
    var consecutiveConnectionDetails = azureservicebusSettings.consecutiveConnectionDetails;
    var dummyZuoraConnection = azureservicebusSettings.dummyZuoraConnection;
    var EC = protractor.ExpectedConditions;
    var that = this;


    this.clickAzureServiceBusConnection = function () {
        browser.wait(EC.visibilityOf(connectionModalElements.AzureServiceBusConnection()), 2000);

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
        browser.wait(EC.visibilityOf(connectionModalElements.AzureServiceBusConnection()),2000);

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

      //     // new connection code added by yoginigore tci 2.0

    this.AzureServiceBusConnection = function (checkSymbolForConnection) {
        checkSymbolForConnection = checkSymbolForConnection || true;
        loggerFile.debug("Adding AzureServiceBus Connection Details");
        browser.sleep(4000);
        that.setAzureServiceBusConnectionName(connectionDetails.name);
        that.setAzureServiceBusConnectionDescription(connectionDetails.description);
        that.setAzureServiceBusAuthRule(connectionDetails.azureservicebusAuthRule);
        that.setAzureServiceBusNamespace(connectionDetails.azureservicebusNameSpace);
        that.setAzureServiceBusKey(connectionDetails.azureservicebusKey);
        that.clickAzureServiceBusConnectionButton();
        browser.sleep(2000);
        /*that.clickSlackConnectionLoginButton();
        browser.sleep(3000);
        // select the pop window
        selectWindow(1);
        browser.driver.manage().window().setSize(browser.params.screen.width,
            browser.params.screen.height);

        that.setSlackWorkspace(connectionDetails.workspace);
        that.clickSlackPopupContinueButton();
        browser.sleep(2000);
        that.setSlackUser(connectionDetails.username);
        that.setSlackPassword(connectionDetails.password);
        that.clickSlackPopupLoginButton();
        browser.sleep(2000);
        //that.clickSlackAuthorizeButton();
        that.clickSlackAllowButton();

        // Interact back with the browser and no longer with the popup
        browser.sleep(4000);
        selectWindow(0);
        browser.sleep(10000);*/
    };


    this.addConnection = function (checkSymbolForConnection) {
        loggerFile.debug("Adding AzureServiceBus Connection");

        TCI.Header.goToConnectionsPage();
        browser.sleep(4000);
        //TCI.Header.waitForPageToBeLoaded;

        TCI.ConnectionsPage.isConnectionPresent(connectionDetails.name).then(function(isPre) {

            if (isPre) {
                log.debug("AzureServiceBus connection " + connectionDetails.name + " is already present");
            }
            else {

                TCI.ConnectionsPage.createConnection("Microsoft Azure ServiceBus Connector", that.AzureServiceBusConnection, checkSymbolForConnection);

            }
        });
    };


    this.editConnection = function (connectionname) {

        TCI.Header.goToConnectionsPage();
        browser.sleep(2000);
        TCI.ConnectionsPage.isConnectionPresent(connectionname).then(function(isPre){
            if (isPre) {
                TCI.ConnectionsPage.clickOnConnection(connectionname);
                browser.sleep(20000);
                that.setAzureServiceBusKey(connectionDetails.azureservicebusKey);
                browser.sleep(2000);
                log.debug("before setting connection name");
                that.clickAzureServiceBusConnectionButton();
                browser.sleep(3000);
                log.debug("after setting connection name");

            }
            else {
                log.debug("AzureServiceBus connection " + connectionDetails.name + " is not imported with app");
            }
        });
    };


    /*this.addConnection = function (checkSymbolForConnection) {
        checkSymbolForConnection = checkSymbolForConnection || true;
        loggerFile.debug("Adding Azure Service Bus Connection");
        baseWI.connectionsHomePageMethods().clickConnectionsTab();
        browser.sleep(2000);
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
                    browser.sleep(2000);
                    browser.wait(EC.visibilityOf(baseWI.connectionsHomePageElements().createdConnection(connectionDetails.name)), timeOutDuration.Long);
                    if (checkSymbolForConnection) {
                        browser.sleep(500);
                        expect(baseWI.connectionsHomePageMethods().checkSymbolForConnection(connectionDetails.name)).toBe(true);
                    }
                });
            }
        });

    };*/

};
module.exports = new connectionModalMethods();