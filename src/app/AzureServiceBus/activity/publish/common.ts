/*
 * Copyright © 2018. TIBCO Software Inc.
 * This file is subject to the license terms contained
 * in the license file that is distributed with this file.
 */
import { Http, Response, URLSearchParams, Headers, RequestOptions } from '@angular/http';

import { Inject, Injectable, Injector } from '@angular/core';
import {
    WiProxyCORSUtils, WiContrib, WiContributionUtils, IContributionTypes,
    WiServiceHandlerContribution, AUTHENTICATION_TYPE, WiContribMessaging, HTTP_METHOD
} from 'wi-studio/app/contrib/wi-contrib';
import { IMessaging } from 'wi-studio/common/models/messaging';
import { WiInternalProxyCORSUtils } from "wi-studio/app/contrib/wi-contrib-internal";
import { IConnectorContribution, IFieldDefinition, IActionResult, ActionResult } from 'wi-studio/common/models/contrib';
import { Observable, ObservableInput } from 'wi-studio/common/rxjs-extensions';
import 'wi-studio/common/rxjs-extensions';
import { IValidationResult, ValidationResult, ValidationError } from 'wi-studio/common/models/validation';
import { httpFactory } from '@angular/http/src/http_module';

export class Connection {
    public name: string;
    public description: string;
    public WI_STUDIO_OAUTH_CONNECTOR_INFO: string;
    public ClientID: string;
    public ClientSecret: string;
    public ConfigProperties: string;
    public DocsMetadata: string;

    public static getConnection(input: IConnectorContribution): Observable<Connection> {
        let connection: Connection = new Connection();
        return Observable.from(input.settings)
            .reduce((acc, obj) => {
                acc[obj.name] = obj.value;
                return acc;
            }, connection);
    }

    public getEntityTypes(): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .map(docsInfo => docsInfo.entityTypes);
    }

    public getPathsForObject(sobject, method): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .mergeMap(docInstance => Observable.from(Object.keys(docInstance.paths))
                .filter(opath => {
                    return opath.startsWith(`/${sobject}`) && docInstance.paths[opath][method];
                }));

    }

    public getOperationsForService(sobject, method): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .mergeMap(docInstance => Observable.from(Object.keys(docInstance.paths))
                .filter(opath => {
                    return opath.startsWith(`/${sobject}`) && docInstance.paths[opath][method];
                })
                .reduce((acc, cpath) => {
                    acc.push(docInstance.paths[cpath][method].action);
                    return acc;
                }, []));
    }

    public getSchemaForPath(spath, method): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .mergeMap(docInstance => Observable.from(Object.keys(docInstance.paths))
                .filter(opath => {
                    return opath === spath && docInstance.paths[opath][method];
                })
                .map(fpath => docInstance.paths[fpath][method].schema));
    }

    public getSchemaForPublish(action, method): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .mergeMap(docInstance => Observable.from(Object.keys(docInstance.paths))
                .filter(opath => {
                    return (docInstance.paths[opath][method] && docInstance.paths[opath][method].action === action);
                })
                .map(fpath => {
                    Object.assign(docInstance.paths[fpath][method].schema, {
                        path: fpath
                    });
                    return docInstance.paths[fpath][method].schema;
                }));
    }
}