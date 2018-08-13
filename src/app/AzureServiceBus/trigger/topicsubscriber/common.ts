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
    public DocsMetadata: string;

    public static getConnection(input: IConnectorContribution): Observable<Connection> {
        let connection: Connection = new Connection();
        return Observable.from(input.settings)
            .reduce((acc, obj) => {
                acc[obj.name] = obj.value;
                return acc;
            }, connection);
    }

    public getOutputSchemaForTrigger (triggerType): Observable<any> {
        return Observable.of(this.DocsMetadata)
            .map(docs => JSON.parse(docs))
            .mergeMap(docInstance => Observable.from(Object.keys(docInstance.paths))
                .filter(opath => {
                    return (docInstance.paths[opath].action && docInstance.paths[opath].action === triggerType);
                })
                .map(fpath => {
                    Object.assign(docInstance.paths[fpath].output, {
                        path: fpath
                    });
                return docInstance.paths[fpath].output;
                })
            );
    }
}