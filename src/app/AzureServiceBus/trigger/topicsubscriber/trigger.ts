import {Injectable, Injector} from "@angular/core";
import {Http} from "@angular/http";
import {Observable} from "rxjs/Observable";
import * as lodash from "lodash";
import {
    ActionResult,
    CreateFlowActionResult,
    IActionResult,
    IConnectorContribution,
    ICreateFlowActionContext,
    IFieldDefinition,
    ITriggerContribution,
    IValidationResult,
    ValidationResult,
    WiContrib,
    WiContribModelService,
    WiContributionUtils,
    WiServiceHandlerContribution
} from "wi-studio/app/contrib/wi-contrib";
import { Connection } from './common';

@WiContrib({})
@Injectable()
export class TopicSubscriberHandler extends WiServiceHandlerContribution {
    private validations: any;
    constructor(private injector: Injector, private http: Http, private contribModelService: WiContribModelService) {
        super(injector, http, contribModelService);
        this.validations = {};
    }

    value = (fieldName: string, context: ITriggerContribution): Observable<any> | any => {

        if (this.validations[context.title] && this.validations[context.title][fieldName]) {
            delete this.validations[context.title][fieldName];
        }

        if (!this.validations[context.title]) {
            this.validations[context.title] = {};
        }

        let connectionField: IFieldDefinition = context.getField("azservicebusConnection");
        let connectionName = connectionField.value ? connectionField.value : '';
        switch (fieldName) {
            case  "azservicebusConnection" : {
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
            case "output" :  {
                if (connectionName !== '' ) {
                    return WiContributionUtils.getConnection(this.http, connectionName)
                    .switchMap(connector => Connection.getConnection(connector))
                    .switchMap(connection => connection.getOutputSchemaForTrigger("TopicSubscribe"))
                    .map(schema => {
                        return JSON.stringify({
                            $schema: "http://json-schema.org/draft-04/schema#",
                            type: "object",
                            definitions: {},
                            properties: schema.properties
                        });
                    })
                    .catch(err => {
                        this.validations[context.title][fieldName] = Observable.of(ValidationResult
                            .newValidationResult().setError("AZSB-TS-MSG-1000", err));
                        return Observable.of("");
                    });
                }
            }
            return Observable.of("");
        }
    }


    validate = (fieldName: string, context: ITriggerContribution): Observable<IValidationResult> | IValidationResult => {
        if (fieldName === "stringValue") {
            let valueType: IFieldDefinition = context.getField("valueType");
            if (valueType.value === "String") {
                return ValidationResult.newValidationResult().setVisible(true);
            } else {
                return ValidationResult.newValidationResult().setVisible(false);
            }
        } else if (fieldName === "jsonValue") {
            let valueType: IFieldDefinition = context.getField("valueType");
            if (valueType.value === "JSON") {
                return ValidationResult.newValidationResult().setVisible(true);
            } else {
                return ValidationResult.newValidationResult().setVisible(false);
            }
        }
        return null;
    }

    action = (fieldName: string, context: ICreateFlowActionContext): Observable<IActionResult> | IActionResult => {
        let modelService = this.getModelService();
        let result = CreateFlowActionResult.newActionResult();
        let connection = <IFieldDefinition>context.getField("azservicebusConnection");
        if (connection && connection.value) {
            let trigger = modelService.createTriggerElement("AzureServiceBus/azservicebus-topicsubscriber-trigger");
            if (trigger && trigger.settings) {
                let azservicebusConnection = trigger.getField("azservicebusConnection");
                azservicebusConnection.value = connection.value;
                azservicebusConnection.allowed = connection.allowed;
                let flowModel = modelService.createFlow(context.getFlowName(), context.getFlowDescription());
                result = result.addTriggerFlowMapping(lodash.cloneDeep(trigger), lodash.cloneDeep(flowModel));
            }
        }
        let actionResult = ActionResult.newActionResult().setSuccess(true).setResult(result);
        return actionResult;
    }
}

