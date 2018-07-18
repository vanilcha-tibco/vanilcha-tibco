/*
 * Copyright © 2017. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */
import { Http, Response, URLSearchParams, Headers, RequestOptions } from '@angular/http';

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
    public resourceURI: string;
    public authorizationRuleName: string;
    public primarysecondaryKey: string;
    public startDate: string;
    public expiryDate: string;
    public configProperties: string;
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

    constructor(@Inject(Injector) injector, private http: Http) {
        super(injector, http);
        this.validations = {};
        this.messaging = new WiContribMessaging();
        this.category = 'azservicebus';
    }

    value = (fieldName: string, context: IConnectorContribution): Observable<any> | any => {
        return null;
    }

    validate = (fieldName: string, context: IConnectorContribution): Observable<IValidationResult> | IValidationResult => {
        if (!this.validations[(<any>context).title]) {
            this.validations[(<any>context).title] = {};
        }
        if (fieldName === 'WI_STUDIO_OAUTH_CONNECTOR_INFO') {
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
        }
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
                    let stringToSign = "";
                    let resourceURL = "";
                    resourceURL = conData.resourceURI;
        stringToSign = (conData.resourceURI !== null && conData.resourceURI.trim().length > 0) ? (stringToSign + conData.resourceURI) : "errorMsg";
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
        let sharedaccesssignature = "SharedAccessSignature sr=" + resourceURL + "&sig=" + hashInBase64 + "&se=" + conData.expiryDate + "&skn=" + conData.authorizationRuleName;
        console.log(sharedaccesssignature);
        let xml = "<entry xmlns=\"http://www.w3.org/2005/Atom\"><content type=\"application/xml\"><QueueDescription xmlns:i=\"http://www.w3.org/2001/XMLSchema-instance\" xmlns=\"http://schemas.microsoft.com/netservices/2010/10/servicebus/connect\"></QueueDescription></content></entry>";        return WiProxyCORSUtils.createRequest(this.http, conData.resourceURI + "/myfirsttestqueue")
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

                    // WiProxyCORSUtils.createRequest(this.http, conData.resourceURI + "/myfirsttestqueue")
                    // .addHeader("Accept", "application/atom+xml")
                    // .addHeader("Content-Type", "application/atom+xml")
                    // .addHeader("Authorization", sharedaccesssignature)
                    // .addMethod("DELETE")
                    // .send()
                    // .catch(err => {
                    // return Observable.of(ActionResult.newActionResult().setSuccess(true)
                    // .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + err)));
                    //  });

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
                .catch(err => {
                    return Observable.of(ActionResult.newActionResult().setSuccess(false)
                        .setResult(new ValidationError("AZSERVICEBUSCONN-1002", "Connection Authentication error: " + err)));
                });
        }
    }

}