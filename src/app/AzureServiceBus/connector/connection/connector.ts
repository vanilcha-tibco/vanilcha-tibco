/*
 * Copyright © 2017. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */
import { Http, Response, URLSearchParams, Headers, RequestOptions, Jsonp } from '@angular/http';

import { Inject, Injectable, Injector } from '@angular/core';
import {
    WiProxyCORSUtils, WiContrib, WiContributionUtils, IContributionTypes,
    WiServiceHandlerContribution, AUTHENTICATION_TYPE, WiContribMessaging
} from 'wi-studio/app/contrib/wi-contrib';
import { WiInternalProxyCORSUtils } from "wi-studio/app/contrib/wi-contrib-internal";
import { IMessaging } from 'wi-studio/common/models/messaging';
import { IConnectorContribution, IFieldDefinition, IActionResult, ActionResult } from 'wi-studio/common/models/contrib';
import { Observable, ObservableInput } from 'wi-studio/common/rxjs-extensions';
import 'wi-studio/common/rxjs-extensions';
import { IValidationResult, ValidationResult, ValidationError } from 'wi-studio/common/models/validation';
import 'rxjs/add/observable/zip';
import * as cryptos from "crypto-js";
import { jsonpFactory } from '@angular/http/src/http_module';
import { JsonSchema } from './schemadoc';

class Result {
    constructor(
        error: boolean,
        errorMsg: string,
        success: boolean) { }
}


export class Connection {
    public name: string;
    public description: string;
    public WI_STUDIO_OAUTH_CONNECTOR_INFO: string;
    public sasFlag: string;
    public resourceURI: string;
    public authorizationRuleName: string;
    public primarysecondaryKey: string;
    public startDate: string;
    public expiryDate: string;
    public configProperties: string;
    public sasToken: string;
  //  private REDIRECT_URI:   Observable<any> = WiContributionUtils.getEnvironment(this.http, 'OAUTH_REDIRECT_URL');
  //  private SCOPE:          string = 'User.Read Files.ReadWrite.All Sites.ReadWrite.All';
    private RESPONSE_TYPE:  string = 'code';
    private PROMPT:         string = 'consent';
   // private TOKEN_ENDPOINT: string = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
   // private LOGIN_ENDPOINT: string = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

    constructor(private http: Http) { }

    public static getConnection(input: ObservableInput<any>, http: Http): Observable<Connection> {
        let connection: Connection = new Connection(http);
        return Observable.from(input)
            .reduce((acc, obj) => {
                acc[obj.name] = obj.value;
                return acc;
            }, connection);
    }
    oAuthProperties = (): Observable<any> => Observable.zip(
        Observable.of(this.authorizationRuleName),
        Observable.of(this.primarysecondaryKey),
        (authorizationRuleName: string, primarysecondaryKey: string) =>
            ({
                authorizationRuleName, primarysecondaryKey
            })
    )
      authorizationNeeded = (): boolean => {
        let authInfo = this.WI_STUDIO_OAUTH_CONNECTOR_INFO && this.WI_STUDIO_OAUTH_CONNECTOR_INFO !== "" ? JSON.parse(this.WI_STUDIO_OAUTH_CONNECTOR_INFO) : {};
        let cProperties = this.configProperties && this.configProperties !== "" ? JSON.parse(this.configProperties) : { authorizationRuleName: "", primarysecondaryKey: "" };

        let required = !authInfo.access_token || this.authorizationRuleName !== cProperties.authorizationRuleName || this.primarysecondaryKey !== cProperties.primarysecondaryKey ? true : false;
        console.log(`Authorization is required: ${required}`);
        return required;
    }
}

@WiContrib({})
@Injectable()
export class TibcoAzServiceBusConnectorContribution extends WiServiceHandlerContribution {
    private category:       string;
    private validations:    any;
    private messaging:      IMessaging;
    private clientSecretField = "clientSecret";
    private NO_CHANGE = null;
    constructor(@Inject(Injector) injector, private http: Http) {
        super(injector, http);
        this.validations = {};
        this.messaging = new WiContribMessaging();
        this.category = 'azservicebus';
    }

    value = (fieldName: string, context: IConnectorContribution): Observable<any> | any => {
        if (this.validations[context.title] && this.validations[context.title][fieldName]) {
            delete this.validations[context.title][fieldName];
        }

        if (!this.validations[context.title]) {
            this.validations[context.title] = {};
        }
        // if (fieldName === 'DocsMetadata') {
        //     return this.connection(context.settings)
        //         //             .switchMap(cdata => cdata.DocsMetadata !== "" && !cdata.authorizationNeeded() ? Observable.of(cdata.DocsMetadata) : cdata.getDocsMetadata(cdata.WI_STUDIO_OAUTH_CONNECTOR_INFO))
        //         .switchMap(cdata => cdata.getDocsMetadata(cdata.WI_STUDIO_OAUTH_CONNECTOR_INFO))
        //         .map(docs => {
        //             return JSON.stringify(docs);
        //         })
        //         .catch(err => {
        //             console.log("Failed to retrieve docsMetadata: " + err.message);
        //             this.validations[context.title][fieldName] = { error: 'Azure-1003', message: err.message };
        //             //  this.messaging.emit<any>(context.title + cdata.name + 'properties', err);
        //             return Observable.of(this.NO_CHANGE);
        //         });
        // }
        return null;
    }

    validate = (fieldName: string, context: IConnectorContribution): Observable<IValidationResult> | IValidationResult => {
        if (!this.validations[(<any>context).title]) {
            this.validations[(<any>context).title] = {};
        }
        let i: number = 0;
        let connsettings = context.settings;
        let arrayObj = new Map();
        let filedarray = context.settings;
        for (i = 0; i < filedarray.length; i++) {
            arrayObj.set(context.settings[i].name, context.settings[i].value);
        }
                          switch (fieldName) {
                        case "WI_STUDIO_OAUTH_CONNECTOR_INFO" :
                            let validation = this.validations[context.title][fieldName];
                            if (validation && validation.value) {
                                let validationValueAsJSON = JSON.parse(JSON.stringify(validation.value));
                                let validationValueErrors = validationValueAsJSON.errors[0];
                                let vresult = ValidationResult.newValidationResult().setVisible(false)
                                    .setError(validationValueErrors.errorCode, validationValueErrors.errorMsg)
                                    .setValid(false);
                                    return Observable.of(vresult);
                            } else {
                                let vresult = ValidationResult.newValidationResult().setVisible(false)
                                    .setValid(true);
                                    return Observable.of(vresult);
                            }
                            case "authorizationRuleName":
                            if (arrayObj.get("sasFlag") === "Generate SAS token") {
                                return ValidationResult.newValidationResult().setVisible(true);
                            }else {
                                return ValidationResult.newValidationResult().setVisible(false);
                            }
                            case "primarysecondaryKey":
                            if (arrayObj.get("sasFlag") === "Generate SAS token") {
                                return ValidationResult.newValidationResult().setVisible(true);
                            }else {
                                return ValidationResult.newValidationResult().setVisible(false);
                            }
                            case "expiryDate":
                            if (arrayObj.get("sasFlag") === "Generate SAS token") {
                                return ValidationResult.newValidationResult().setVisible(true);
                            }else {
                                return ValidationResult.newValidationResult().setVisible(false);
                            }
                            case "sasToken":
                            if (arrayObj.get("sasFlag") === "Generate SAS token") {
                                return ValidationResult.newValidationResult().setVisible(false);
                            }else {
                                return ValidationResult.newValidationResult().setVisible(true);
                            }
                        }
                }

    connection = (input: ObservableInput<any>): Observable<Connection> => {
        let connection: Connection = new Connection(this.http);
        return Observable.from(input)
            .reduce((acc, obj) => {
                acc[obj.name] = obj.value;
                return acc;
            }, connection);
    }

    isDuplicate = (con: Connection, uniqueID: string): Observable<boolean> => {
        let collected: Connection[] = [];
        return WiContributionUtils.getConnections(this.http, this.category)
            .mergeMap(connectors => connectors)
            .map(connector => {
                return {
                    id: WiContributionUtils.getUniqueId(connector),
                    ction: this.connection(connector.settings)
                };
            })
            .filter(conn => conn.id !== uniqueID)
            .mergeMap(connctx => connctx.ction)
            .filter(ction => ction.name === con.name)
            .reduce((conAcc, conObj) => {
                conAcc.push(conObj);
                return conAcc;
            }, collected)
            .map(duplicates => duplicates.length > 0);
    }

    defaultResult = (context: IConnectorContribution): Observable<IActionResult> => {
        let actionResult = {
            context: context,
            authType: AUTHENTICATION_TYPE.BASIC,
            authData: {}
        };
        return Observable.of(ActionResult.newActionResult().setResult(actionResult));
    }

    action = (actionName: string, context: IConnectorContribution): Observable<IActionResult> | IActionResult => {
        let sharedaccesssignature;
        if (actionName === "Login") {
            return this.connection(context.settings)
                .switchMap(con => this.isDuplicate(con, WiContributionUtils.getUniqueId(context))
                    .map(duplicate => {
                        if (duplicate) {
                            throw new Error(`Connection with name ${con.name} already exists`);
                        }
                        return con;
                    }))
                .switchMap(conData => {
                    if ( conData.resourceURI === "") {
                        throw new Error("Please enter the resource URI");
                    }
                    let resourceURL = "";
                    resourceURL = "https://" + conData.resourceURI + ".servicebus.windows.net";
                    if (conData.sasFlag === "Generate SAS token") {
                        if ( conData.primarysecondaryKey === "") {
                            throw new Error("Please enter the primary/secondaryKey");
                        }
                        if ( conData.authorizationRuleName === "") {
                            throw new Error("Please enter the Authorization RuleName");
                        }
                        if ( conData.expiryDate === "") {
                            throw new Error("Please enter the expiryDate");
                        }
                    let stringToSign = "";
        stringToSign = (resourceURL !== null && resourceURL.trim().length > 0) ? (stringToSign + resourceURL) : "errorMsg";
        let expiryDate = new Date(conData.expiryDate);
        conData.expiryDate = String(expiryDate.getTime() / 1000.0);
        stringToSign = (encodeURIComponent(stringToSign) + "\n" + conData.expiryDate);
        console.log(stringToSign);
        if (stringToSign.includes("errorMsg")) {
            throw new Error(`errorMsg`);
        }
        if (!(conData.authorizationRuleName !== null && conData.authorizationRuleName.trim().length > 0)) {
            throw new Error(`errorMsg`);
        }
        let hash, hashInBase64;
        let signingKey = conData.primarysecondaryKey;
        let decodedKey = (signingKey);
        hash = cryptos.HmacSHA256(stringToSign, decodedKey);
        hashInBase64 = cryptos.enc.Base64.stringify(hash);
        console.log("sig:" + hashInBase64);
        hashInBase64 = encodeURIComponent(hashInBase64);
        resourceURL = encodeURIComponent(resourceURL);
        console.log(resourceURL);
        console.log("sig:" + hashInBase64);
        sharedaccesssignature = "SharedAccessSignature sr=" + resourceURL + "&sig=" + hashInBase64 + "&se=" + conData.expiryDate + "&skn=" + conData.authorizationRuleName;
    }else if (conData.sasFlag === "Enter SAS token") {
        if (conData.sasToken !== "") {
            sharedaccesssignature = conData.sasToken;
    }
    else {
        return Observable.of(ActionResult.newActionResult().setSuccess(false)
                        .setResult(new ValidationError("AZSERVICEBUSCONN-1003", "SAS Token is empty. Please provide a valid SAS token")));
    }
    }
        console.log(sharedaccesssignature);
        let xml = "<entry xmlns=\"http://www.w3.org/2005/Atom\"><content type=\"application/xml\"><QueueDescription xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://schemas.microsoft.com/netservices/2010/10/servicebus/connect\"></QueueDescription></content></entry>";
      //   return WiProxyCORSUtils.createRequest(this.http, conData.resourceURI + "/myfirsttestqueue")
      return WiProxyCORSUtils.createRequest(this.http, conData.resourceURI )
        .addHeader("Accept", "application/atom+xml")
        .addHeader("Content-Type", "application/atom+xml;type=entry;charset=utf-8")
        .addHeader("Authorization", sharedaccesssignature)
        .addMethod("PUT")
        .addBody("<entry xmlns=\"http://www.w3.org/2005/Atom\"><content type=\"application/xml\"><QueueDescription xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://schemas.microsoft.com/netservices/2010/10/servicebus/connect\"></QueueDescription></content></entry>")
        .send()
        .switchMap((response: Response) => {
            if (response.status !== 401) {
                for (let i = 0; i < context.settings.length; i++) {
                    if (context.settings[i].name === "WI_STUDIO_OAUTH_CONNECTOR_INFO") {
                        context.settings[i].value = sharedaccesssignature;
                        break;
                    }

                    WiProxyCORSUtils.createRequest(this.http, conData.resourceURI + "/myfirsttestqueue")
                    .addHeader("Accept", "application/atom+xml")
                    .addHeader("Content-Type", "application/atom+xml")
                    .addHeader("Authorization", sharedaccesssignature)
                    .addMethod("DELETE")
                    .send()
                    .catch(err => {
                    return Observable.of(ActionResult.newActionResult().setSuccess(true));
                     });

                }
                let actionResult = {
                    context: context,
                    authType: AUTHENTICATION_TYPE.BASIC,
                    authData: {}
                };
                return Observable.of(ActionResult.newActionResult().setResult(actionResult));
            }
        });
                })
                .catch( (response: Response) => {
                    if (response.status !== 401) {
                        for (let i = 0; i < context.settings.length; i++) {
                            if (context.settings[i].name === "WI_STUDIO_OAUTH_CONNECTOR_INFO") {
                                context.settings[i].value = sharedaccesssignature;
                                if ( context.settings["primarysecondaryKey"] != null) {
                                    context.settings["primarysecondaryKey"].value = "";
                                }
                            }else if (context.settings[i].name === "DocsMetadata") {
                            context.settings[i].value = JsonSchema.Types.schemaDoc();
                            //    console.log(context.settings[i].value);
                        }
                        }
                        let actionResult = {
                            context: context,
                            authType: AUTHENTICATION_TYPE.BASIC,
                            authData: {}
                        };
                        return Observable.of(ActionResult.newActionResult().setResult(actionResult));
                    }
                        else {
                    return Observable.of(ActionResult.newActionResult().setSuccess(false)
                        .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + response.statusText + ": Check your connection parameters")));
                    }
                });
        }
    }

}