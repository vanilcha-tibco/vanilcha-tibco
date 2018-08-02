export namespace JsonSchema {

  export class Types {

    public static schemaDoc = () => `{      
      "entityTypes":["Queue","Topic"],
      "paths": {
        "Queue": {
          "post": {
            "summary": "Publish Message to Queue",
            "action": "Queue",
            "schema": {
              "parameters": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "queueName": { "type": "string" },
                  "messageString": {"type": "string"},
                  "brokerProperties": {"type": "object", "properties": {
                      "ContentType": { "type" : "string"},
                      "CorrelationId": {"type" : "string"},
                      "TimeToLive": { "type" : "integer", "minimum": 0},
                      "ForcePersistence": {"type": "boolean"},
                      "Label": {"type" : "string"},
                      "MessageId": {"type" : "string"},
                      "PartitionKey": {"type" : "string"},
                      "ReplyTo": {"type" : "string"},
                      "ReplyToSessionId": {"type" : "string"},
                      "SessionId": {"type" : "string"},
                      "To": {"type" : "string"},
                      "ViaPartitionKey": {"type" : "string"}
                  }  }
              },
                "required": [
                  "queueName",
                  "messageString"
                ]
              },
              "output": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "responseCode": { "type": "string" },
                  "responseMessage": {"type": "string" }
          }
              }
            }
          }
        },
        "Topic": {
          "post": {
            "summary": "Publish Message to Topic",
            "action": "Topic",
            "schema": {
              "parameters": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "topicName": { "type": "string" },
                  "messageString": {"type": "string"},
                  "brokerProperties": {"type": "object", "properties": {
                      "ContentType": { "type" : "string"},
                      "CorrelationId": {"type" : "string"},
                      "TimeToLive": { "type" : "integer", "minimum": 0},
                      "ForcePersistence": {"type": "boolean"},
                      "Label": {"type" : "string"},
                      "MessageId": {"type" : "string"},
                      "PartitionKey": {"type" : "string"},
                      "ReplyTo": {"type" : "string"},
                      "ReplyToSessionId": {"type" : "string"},
                      "SessionId": {"type" : "string"},
                      "To": {"type" : "string"},
                      "ViaPartitionKey": {"type" : "string"}
                  }  }
              },
                "required": [
                  "topicName",
                  "messageString"
                ]
              },
              "output": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "responseCode": { "type": "string" },
                  "responseMessage": {"type": "string" }
          }
              }
            }
          }
        }   
      }
    }`
  }
}
