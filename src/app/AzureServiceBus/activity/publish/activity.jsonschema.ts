export namespace JsonSchema {

    export class Types {

        public static getInputObject(entityName: string) {
            let ownershipId: string = "";
            switch (entityName) {
                case "Queue": {
                    return {
                        "type": "object",
                        "properties": {
                            "queueName": { "type": "string" },
                            "messageString": {"type": "string"},
                            "brokerProperties": {"type": "object", "properties": {} }
                        },
                        "required": [
                            "queueName",
                            "messageString"
                        ]
                    };
                }
                case "Topic": {
                    return {
                        "type": "object",
                        "properties": {
                            "topicName": { "type": "string" },
                            "messageString": {"type": "string"},
                            "brokerProperties": {"type": "object", "properties": {
                                "ContentType": { "type" : "string"},
                                "CorrelationId": {"type" : "string"},
                                "EnqueuedSequenceNumber": { "type" : "long"},
                                "ForcePersistence": {"type": "bool"},
                                "Label": {"type" : "string"},
                                "MessageId": {"type" : "string"},
                                "PartitionKey": {"type" : "string"},
                                "ReplyTo": {"type" : "string"},
                                "ReplyToSessionId": {"type" : "string"},
                                "SessionId": {"type" : "string"},
                                "To": {"type" : "string"},
                                "ViaPartitionKey": {"type" : "string"}
                            } }
                        },
                        "required": [
                            "topicName",
                            "messageString"
                        ]
                    };
                }
            }
        }
        public static getOutputObject(entityName: string) {
             return {
                        "type": "object",
                        "properties": {
                            "responseCode": { "type": "string" },
                            "responseMessage": {"type": "string" }
                    }
                };
        }
    }
}