import { Observable } from "rxjs/Observable";
import { Http, Response, Headers, RequestOptions } from "@angular/http";
import { Inject, Injectable, Injector } from "@angular/core";
import {
    HTTP_METHOD,
    IActivityContribution,
    IConnectorContribution,
    IFieldDefinition,
    IValidationResult,
    ValidationResult,
    WiContrib,
    WiContributionUtils,
    WiServiceHandlerContribution,
    WiProxyCORSUtils, WiContribMessaging
} from "wi-studio/app/contrib/wi-contrib";
import { WiInternalProxyCORSUtils } from "wi-studio/app/contrib/wi-contrib-internal";
import { IMessaging } from 'wi-studio/common/models/messaging';
import { JsonSchema } from "./activity.jsonschema";


@Injectable()
@WiContrib({})

export class AzServiceBusPublishActivityContribution extends WiServiceHandlerContribution {

    private category: string;
    private messaging: IMessaging;
    private validations: any;
    private method: string;

    constructor(@Inject(Injector) injector, private http: Http) {
        super(injector, http);
        this.category = 'AzureServiceBus';
        this.validations = {};
        this.messaging = new WiContribMessaging();
        this.method = 'post';
    }

    value = (fieldName: string, context: IActivityContribution): Observable<any> | any => {
        let connectionField: IFieldDefinition = context.getField("Connection");
        let connectionName = connectionField.value ? connectionField.value : '';
        let entityNameField: IFieldDefinition = context.getField("entityName");
        let entityName = entityNameField.value ? entityNameField.value : '';


        if (this.validations[context.title] && this.validations[context.title][fieldName]) {
            delete this.validations[context.title][fieldName];
        }

        if (!this.validations[context.title]) {
            this.validations[context.title] = {};
        }

        console.log(fieldName);
        switch (fieldName) {
        case "Connection" : {
            // Connector Type must match with the name defined in connector.json
            return Observable.create(observer => {
                let connectionRefs = [];
                WiContributionUtils.getConnections(this.http, "AzureServiceBus").subscribe((data: IConnectorContribution[]) => {
                    data.forEach(connection => {
                        for (let i = 0; i < connection.settings.length; i++) {
                            if (connection.settings[i].name === "name") {
                                connectionRefs.push({
                                    "unique_id": WiContributionUtils.getUniqueId(connection),
                                    "name": connection.settings[i].value
                                });
                                break;
                            }
                        }
                    });
                    observer.next(connectionRefs);
                });
            });
        }
        case "entityName" : {
            if (connectionName !== '') {
                return Observable.create(observer => {
                    {
                        let operationNames: string[];
                            operationNames = ["Queue", "Topic"];
                            observer.next(operationNames);
                        }
                    }
                    );
                }
            }
        case "input" : {
            if (connectionName !== '' && entityName !== '' ) {
            let entityname: IFieldDefinition = context.getField("entityName");
            if (entityname.value) {
                return Observable.create(observer => {
                    observer.next(JSON.stringify(JsonSchema.Types.getInputObject(entityname.value)));
                });
            }
            }
        }
        case "output" :  {
            if (connectionName !== '' && entityName !== '') {
                return Observable.create(observer => {
                    let examplesSchema;
                    if (entityName === "Queue") {
                        examplesSchema = JsonSchema.Types.getOutputObject(entityName);
                    }
                    else if (entityName === "Topic") {
                        examplesSchema = JsonSchema.Types.getOutputObject(entityName);
                    }
                    observer.next(JSON.stringify(examplesSchema));
        });
            }
        }
        return null;
    }
}

    validate = (fieldName: string, context: IActivityContribution): IValidationResult => {
        if (!this.validations[(<any>context).title]) {
            this.validations[(<any>context).title] = {};
        }
        return this.validations[(<any>context).title][fieldName] ? this.validations[(<any>context).title][fieldName] : null;
    }
}
