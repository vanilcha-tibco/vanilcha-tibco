export namespace JsonSchema {

  export class Types {

    public static schemaDoc = () => `{
      "entityTypes":["Queue","Topic"],
      "paths": {
        "QueueReceive":{
          "summary": "Queue Receiver",
          "action": "QueueReceive",
          "output": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "messageString": {"type": "string"},
                  "brokerProperties": {
                    "type": "object",
                    "properties": {
                        "ContentType": { "type" : "string"},
                        "CorrelationId": {"type" : "string"},
                        "Label": {"type" : "string"},
                        "PartitionKey": {"type" : "string"},
                        "ReplyTo": {"type" : "string"},
                        "TimeToLive": { "type" : "integer"},
                        "To": {"type" : "string"}
                    }
                  }
                }
            }
        },
        "TopicSubscribe":{
          "summary": "Topic Subscriber",
          "action": "TopicSubscribe",
          "output": {
                "$id": "http://example.com/example.json",
                "type": "object",
                "definitions": {},
                "$schema": "http://json-schema.org/draft-07/schema#",
                "additionalProperties": false,
                "properties": {
                  "messageString": {"type": "string"},
                  "brokerProperties": {
                    "type": "object",
                    "properties": {
                        "ContentType": { "type" : "string"},
                        "CorrelationId": {"type" : "string"},
                        "Label": {"type" : "string"},
                        "PartitionKey": {"type" : "string"},
                        "ReplyTo": {"type" : "string"},
                        "TimeToLive": { "type" : "integer"},
                        "To": {"type" : "string"}
                    }
                  }
                }
            }
        },
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
                      "Label": {"type" : "string"},
                      "PartitionKey": {"type" : "string"},
                      "ReplyTo": {"type" : "string"},
                      "SessionId": {"type" : "string"},
                      "TimeToLive": { "type" : "integer", "minimum": 0},
                      "To": {"type" : "string"}
                  }
                }
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
                      "Label": {"type" : "string"},
                      "PartitionKey": {"type" : "string"},
                      "ReplyTo": {"type" : "string"},
                      "SessionId": {"type" : "string"},
                      "TimeToLive": { "type" : "integer", "minimum": 0},
                      "To": {"type" : "string"}
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
