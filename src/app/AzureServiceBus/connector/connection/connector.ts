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
    public resourceURI: string;
    public authorizationRuleName: string;
    public primarysecondaryKey: string;
    public configProperties: string;
    public static dateRegx = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2]\d|3[0-1])T(?:[0-1]\d|2[0-3]):[0-5]\d:[0-5]\dZ/;

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
}

@WiContrib({})
@Injectable()
export class TibcoAzServiceBusConnectorContribution extends WiServiceHandlerContribution {
    private category:       string;
    private validations:    any;
    constructor(@Inject(Injector) injector, private http: Http) {
        super(injector, http);
        this.validations = {};
        this.category = 'AzureServiceBus';
    }

    value = (fieldName: string, context: IConnectorContribution): Observable<any> | any => {
        if (this.validations[context.title] && this.validations[context.title][fieldName]) {
            delete this.validations[context.title][fieldName];
        }

        if (!this.validations[context.title]) {
            this.validations[context.title] = {};
        }
        return null;
    }

    validate = (fieldName: string, context: IConnectorContribution): Observable<IValidationResult> | IValidationResult => {
       return null;
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
                    if (!(conData.name !== null && conData.name.trim().length > 0)) {
                        throw new Error(`Please enter the Connection Name!`);
                    }
                    if ( conData.resourceURI === "") {
                        throw new Error("Please enter the resource URI");
                    }
                    let resourceURL = "";
                    resourceURL = "https://" + conData.resourceURI + ".servicebus.windows.net";
                        if ( conData.authorizationRuleName === "") {
                            throw new Error("Please enter the Authorization Rule Name!");
                        }
                        if ( conData.primarysecondaryKey === "") {
                            throw new Error("Please enter the primary/secondaryKey!");
                        }
                    let stringToSign = "";
        stringToSign = (resourceURL !== null && resourceURL.trim().length > 0) ? (stringToSign + resourceURL) : "errorMsg";
        let expiryDate =  String(new Date().getTime() / 1000.0 + 60 * 60 * 24 * 1);
        stringToSign = (encodeURIComponent(stringToSign) + "\n" + expiryDate);
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
        hashInBase64 = encodeURIComponent(hashInBase64);
        resourceURL = encodeURIComponent(resourceURL);
        console.log(resourceURL);
        conData.primarysecondaryKey = "";
        sharedaccesssignature = "SharedAccessSignature sr=" + resourceURL + "&sig=" + hashInBase64 + "&se=" + expiryDate + "&skn=" + conData.authorizationRuleName;
      resourceURL = "https://" + conData.resourceURI + ".servicebus.windows.net";
      return WiProxyCORSUtils.createRequest(this.http, resourceURL  + "/testconnectionqueue" + expiryDate)
        .addHeader("Content-Type", "application/atom+xml;type=entry;charset=utf-8")
        .addHeader("Authorization", sharedaccesssignature)
        .addHeader("If-Match", "*")
        .addMethod("PUT")
        .addBody('<entry xmlns="http://www.w3.org/2005/Atom"><content type="application/xml"><QueueDescription xmlns="http://schemas.microsoft.com/netservices/2010/10/servicebus/connect"><MaxDeliveryCount>10</MaxDeliveryCount></QueueDescription></content></entry>')
        .send()
        .switchMap((response: Response) => {
            if (response.status  >= 500 || response.status === 401)  {
                return Observable.of(ActionResult.newActionResult().setSuccess(false)
                    .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + response.statusText + ": Check your connection parameters")));
            }
            else {
                for (let i = 0; i < context.settings.length; i++) {
                    if (context.settings[i].name === "DocsMetadata") {
                   context.settings[i].value = JsonSchema.Types.schemaDoc();
               }
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
                .catch( (response => {
                    if (response instanceof Response) {
                    if (response.status) {
                    if (response.status >= 500 || response.status === 401) {
                        return Observable.of(ActionResult.newActionResult().setSuccess(false)
                        .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + response.statusText + ": Check your connection parameters")));

                    }
                        else {
                            for (let i = 0; i < context.settings.length; i++) {
                                if (context.settings[i].name === "DocsMetadata") {
                               context.settings[i].value = JsonSchema.Types.schemaDoc();
                           }
                           }
                           let actionResult = {
                               context: context,
                               authType: AUTHENTICATION_TYPE.BASIC,
                               authData: {}
                           };
                           return Observable.of(ActionResult.newActionResult().setResult(actionResult));
                    }
                }
                else {
                        return Observable.of(ActionResult.newActionResult().setSuccess(false)
                            .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + response.statusText + ": Check your connection parameters")));
                }
                }
                else if (response instanceof Error) {
                    console.log("AuthenticationFailed: " + response);
                    return Observable.of(ActionResult.newActionResult().setSuccess(false)
                    .setResult(new ValidationError("AZSERVICEBUSCONN-1005", "Connection Authentication error: " + response.message)));
                }
            }
            ));
        }
    }

}