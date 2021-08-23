/**
 * Created by hkher on 10/29/17.
 */

const { element } = require("protractor");

/**
 * Contains all the elements used on the SugarCRM Create modal for the Web Integrator.
 */
var PaletteElements = function () {


    /**
     * @returns {WebElementPromise} element.
     */
    this.AzureServiceBusTab = function () {
        //return element(by.xpath("//div[contains(text(), 'AzureServiceBus')]"));
        return element(by.xpath("//div[contains(@id, 'propertyPaletteContainer')]//div[contains(text(), 'AzureServiceBus')]"));
    };

    /**
     * @returns {SugarCRMCreateActivity} element.
     */
    this.AzureServiceBusPublishActivity = function () {
        return element(by.xpath("//div[contains(@class, 'ta-type')]//div[contains(text(), '"+ commonElements.activityType.AzureServiceBusPublish+"')]"));
    };

    /**
     * @returns {connectionSelectlist} element.
     */
    this.connectionSelectlist = function () {
        return element(by.id('Connection'));
    };


    /**
     * @returns {connectionSelectlist option} element.
     */
    this.connectionSelectlistoption = function (option) {
        return element(by.xpath("//option[contains(text(),'"+option +"')]"));
    };


    /**
     * @returns {objectSelect} element.
     */
    this.EntitySelect = function () {
        return element(by.id('entityType'));
    };


    /**
     * @returns {objectSelect} element.
     */
    this.EntitySelectValue = function (option) {
        return element(by.xpath("//option[contains(text(),'"+option +"')]"));
    };
    /*
        this.EntitySelectTopic = function (option) {
            return element(by.xpath("//option[contains(text(),'"+option +"')]"));
        };*/

    this.inputTabspublish = function () {
        return browser.driver.findElement(by.xpath("//div[contains(text(), 'Input') and position() = 2]"));
    }

    this.topicSubscriberTrigger = function (){
        return element(by.xpath("//div[contains(@class,'wi-card-title-connector') and contains(text(),'AzureServiceBus TopicSubscriber')]"));
    }

    this.deadlettersubscriptionenabled=function(){
        //return element(by.xpath("//div[contains(@class,'radio')]//label[1]"));
        return element(by.xpath("//div[contains(@class,'radio')]"));
    
    }

    this.queueRecieverTrigger = function (){
        return element(by.xpath("//div[contains(@class,'wi-card-title-connector') and contains(text(),'AzureServiceBus QueueReceiver')]"));
    }
};
module.exports = new PaletteElements();
