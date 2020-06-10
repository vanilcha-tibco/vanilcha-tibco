var connectionModalElements = function () {


    this.createdAzureServiceBusConnection = function (connectionname) {
        return element(by.xpath("//div[contains(@class,'wi-card-subtitle-connector') and contains(text(), '" + connectionname + "')]"));
    };

    this.AzureServiceBusConnection = function () {
        return element(by.xpath("//div[contains(@class,'wi-card-title-connector') and contains(text(),'Microsoft Azure ServiceBus Connector')]"));
    };


    this.AzureServiceBusConnectionName = function () {
        return element(by.xpath("//input[@id='name']"));

    };

    this.AzureServiceBusConnectionDescription = function () {
        return element(by.xpath("//input[@id='description']"));
    };


    this.AzureServiceBusNamespace = function () {
        return element(by.xpath("//input[@id='resourceURI']"));
    };

    this.AzureServiceBusAuthRule = function () {
        return element(by.xpath("//input[@id='authorizationRuleName']"));
    };

    this.AzureServiceBusKey = function () {
        return element(by.xpath("//input[@id='primarysecondaryKey']"));
    }


    this.AzureServiceBusLoginConnectionButton = function () {
        return element(by.xpath("//button[contains(@class,'btn btn-primary pull-right') and contains(text(),'Login')]"));
        //return element(by.css('.btn.btn-primary'));
    };
};
module.exports = new connectionModalElements();