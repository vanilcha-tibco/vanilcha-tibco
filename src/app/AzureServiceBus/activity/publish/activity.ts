import { Observable } from "rxjs/Observable";
import { Http } from "@angular/http";
import { Inject, Injectable, Injector } from "@angular/core";
import {
    IActivityContribution,
    IConnectorContribution,
    IFieldDefinition,
    IValidationResult,
    ValidationResult,
    WiContrib,
    WiContributionUtils,
    WiServiceHandlerContribution,
    WiContribMessaging
} from "wi-studio/app/contrib/wi-contrib";
import { IMessaging } from 'wi-studio/common/models/messaging';
import { Connection } from './common';


@Injectable()
@WiContrib({})

export class AzServiceBusPublishActivityContribution extends WiServiceHandlerContribution {

    private messaging: IMessaging;
    private validations: any;
    private method: string;

    constructor(@Inject(Injector) injector, private http: Http) {
        super(injector, http);
        this.validations = {};
        this.messaging = new WiContribMessaging();
        this.method = 'post';
    }

    value = (fieldName: string, context: IActivityContribution): Observable<any> | any => {
        let connectionField: IFieldDefinition = context.getField("Connection");
        let connectionName = connectionField.value ? connectionField.value : '';
        let entityNameField: IFieldDefinition = context.getField("entityType");
        let entityType = entityNameField.value ? entityNameField.value : '';


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
        case "entityType" : {
            if (connectionName !== '') {
                return WiContributionUtils.getConnection(this.http, connectionName)
                    .switchMap(connector => Connection.getConnection(connector))
                    .switchMap(connection => connection.getEntityTypes());
                }
            }
        case "input" : {
            if (connectionName !== '' && entityType !== '' ) {
                return WiContributionUtils.getConnection(this.http, connectionName)
                .switchMap(connector => Connection.getConnection(connector))
                .switchMap(connection => connection.getSchemaForPublish(entityType, this.method))
                .map(schema => {
                    if (!schema.parameters || !schema.output) {
                        throw new Error("No body or output schema retrieved for method " + this.method);
                    }
                    this.messaging.emit<any>(context.title + connectionName + 'output', schema.output);
                    this.messaging.emit<any>(context.title + connectionName + 'path', schema.path);

                    let customPropertiesData: IFieldDefinition = context.getField("customProperties");
                    let properties = schema.parameters.properties;
                    if (customPropertiesData && customPropertiesData.value) {
                        let converted = {};
                        converted["type"] = "object";
                        let innerProperties = {};
                        let customPropertiesValues: any = JSON.parse(customPropertiesData.value.toString());
                        for (let i = 0; i < customPropertiesValues.length; i++) {
                            innerProperties[customPropertiesValues[i].parameterName] = {
                                "type": customPropertiesValues[i].type
                            };
                        }
                        converted["properties"] = innerProperties;
                        properties["customProperties"] = converted;
                        schema.parameters.properties = properties;
                    }
                    console.log(properties);
                    return JSON.stringify({
                        $schema: "http://json-schema.org/draft-04/schema#",
                        type: "object",
                        definitions: {},
                        properties: {
                            parameters: schema.parameters
                        }
                    });
                })
                .catch(err => {
                    console.log("Error occurred fetching input metadata: " + err);
                    this.validations[context.title][fieldName] = Observable.of(ValidationResult
                        .newValidationResult().setError("SFP-QRY-MSG-1000", err));
                    return Observable.of("");
                });
            }
        }
        case "output" :  {
            if (connectionName !== '' && entityType !== '') {
                return Observable.create(observer => {
                    this.messaging.on<any>(context.title + connectionName + 'output', data => {
                        if (data != null) {
                            this.messaging.off(context.title + connectionName + 'output');
                            observer.next(data);
                        }
                    });
                })
                    .map(outputSchema => {
                        return JSON.stringify({
                            $schema: "http://json-schema.org/draft-04/schema#",
                            type: "object",
                            definitions: {},
                            properties: outputSchema.properties
                        });
                    });
            }
        }
        return null;
    }
}

    validate = (fieldName: string, context: IActivityContribution): Observable<IValidationResult> | IValidationResult => {
        switch (fieldName) {
        case "customProperties":
            return this.validateParametersByName(fieldName, context);
        default:
            if (!this.validations[(<any>context).title]) {
                this.validations[(<any>context).title] = {};
            }
            return this.validations[(<any>context).title][fieldName] ? this.validations[(<any>context).title][fieldName] : null;
        }
    }

    private validateParametersByName(fieldName: string, context: IActivityContribution): Observable<IValidationResult> | IValidationResult {
        return Observable.create(observer => {
          let vresult = ValidationResult.newValidationResult();
          let pathParams: IFieldDefinition = context.getField(fieldName);
          let arrParamNamesTmp: any[] = [];
          let errMessage: string = "";
          let queryParamsParsed: any = {};
          try {
            queryParamsParsed = JSON.parse(pathParams.value);
          } catch (e) {
            //
          }
          for (let queryParam of queryParamsParsed) {
            if (!queryParam.parameterName) {
              errMessage = "Parameter Name should not be empty";
              vresult.setError("AzureServiceBus-1001", errMessage);
              vresult.setValid(false);
              break;
            } else {
              for (let paramName of arrParamNamesTmp) {
                if (paramName === queryParam.parameterName) {
                  errMessage = "Parameter Name \'" + queryParam.parameterName + "\' already exists";
                  vresult.setError("AzureServiceBus-1001", errMessage);
                  vresult.setValid(false);
                  break;
                }
              }
              arrParamNamesTmp.push(queryParam.parameterName);
            }
          }
          observer.next(vresult);
          observer.complete();
        });
    }
}
