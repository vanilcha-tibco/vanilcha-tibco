const Rx = require('rxjs/Rx');
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

function getVendorPath(cePath) {
  return getMapping()
    .mergeMap(mapdata => Rx.Observable.of(cePath)
      .mergeMap(cpath => cpath.split('/'))
      .map(mapped => mapdata.hasOwnProperty(mapped) ? mapdata[mapped] : mapped)
      .reduce((acc, obj) => {
        acc.push(obj);
        return acc;
      }, [])
      .map(adata => adata.join('/')));
}

function getCEPath(vendorPath) {
  return getMapping()
    .mergeMap(mappings => Rx.Observable.from(Object.entries(mappings)))
    .reduce((mapdata, [key, value]) => {
      mapdata[value] = key;
      return mapdata;
    }, {})
    .mergeMap(valueMap => Rx.Observable.of(vendorPath)
      .mergeMap(vpath => vpath.split('/'))
      .map(mapped => valueMap.hasOwnProperty(mapped) ? valueMap[mapped] : mapped)
      .reduce((acc, obj) => {
        acc.push(obj);
        return acc;
      }, [])
      .map(adata => adata.join('/')));

}

function getMapping() {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/marketingInstance.json'))
    .map(instance => JSON.parse(instance))
    .mergeMap(transforms => transforms.element.defaultTransformations)
    .reduce((mapdata, mapobj) => {
      mapdata[mapobj.name] = mapobj.vendorName;
      return mapdata;
    }, {})
}

function getPathsForObject(sobject, method) {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Rx.Observable.from(Object.keys(docInstance.paths))
      .filter(opath => {
        return opath.startsWith(`/${sobject}`) && docInstance.paths[opath][method];
      }))

}

function getActionsForObject(sobject, method) {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Rx.Observable.from(Object.keys(docInstance.paths))
      .filter(opath => {
        return opath.startsWith(`/${sobject}`) && docInstance.paths[opath][method];
      })
      .reduce((acc, cpath) => {
        acc.push(docInstance.paths[cpath][method].action);
        return acc;
      }, []))
}

function getSchemaForPath(spath, method) {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Rx.Observable.from(Object.keys(docInstance.paths))
      .filter(opath => {
        return opath === spath && docInstance.paths[opath][method];
      })
      .map(fpath => docInstance.paths[fpath][method].schema));
}

function getSchemaForAction(action, method) {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Rx.Observable.from(Object.keys(docInstance.paths))
      .filter(opath => {
        return (docInstance.paths[opath][method] && docInstance.paths[opath][method].action === action);
      })
      .map(fpath => {
        Object.assign(docInstance.paths[fpath][method].schema, {
          path: fpath
        })
        return docInstance.paths[fpath][method].schema;
      }));
}

function getSchemaAsJsonString() {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .map(docsMetadata => JSON.stringify(docsMetadata));
}

function getVendorPathsForCEObject(ceObject, method) {
  console.log(ceObject)
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Rx.Observable.from(Object.keys(docInstance.paths))
      .filter(opath => {
        //console.log(opath);
        //console.log(docInstance.paths[opath][method]);
        return opath.startsWith(`${ceObject}`) && docInstance.paths[opath][method];
      }))
    //.do(cpath => console.log(`original: ${cpath} `))
    .mergeMap(getVendorPath)
    .reduce((pathAcc, vpathObj) => {
      pathAcc.push(vpathObj);
      return pathAcc;
    }, []);
}

function getAllVendorPaths() {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .mergeMap(docInstance => Object.keys(docInstance.paths))
    .mergeMap(getVendorPath)
    .reduce((pathAcc, vpathObj) => {
      pathAcc.push(vpathObj);
      return pathAcc;
    }, []);
}

function getVendorObjects() {
  return getMapping()
    .map(mappings => Object.values(mappings));
}

function getCEObject(vendorObjectName) {
  return getMapping()
    .switchMap(mapping => Object.entries(mapping))
    .filter(([key, value]) => value === vendorObjectName)
    .map(([key, value]) => key)
}

function getInputSchemaFromPath(vendorPath, method) {
  return getCEPath(vendorPath)
    .switchMap(ceObject => Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
      .map(docs => JSON.parse(docs))
      .map(docInstance => docInstance.paths[`${ceObject}`][method]['parameters'])
      .mergeMap(parameters => parameters)
      .filter(fdata => fdata.name !== 'Authorization'))
    .reduce((acc, value) => {
      acc.properties.parameters.properties[value.name] = {
        type: value.type,
        description: value.description
      };
      return acc;
    }, {
      $schema: "http://json-schema.org/draft-04/schema#",
      type: "object",
      definitions: {},
      properties: {
        parameters: {
          type: "object",
          properties: {}
        }
      }
    });
}

const CE_ORG_TOKEN = Rx.Observable.of('HaCt3ayVXo6pPAYsNB9hEhOgdujcXwy7k5DNibD32Es=');
const CE_USER_SECRET = Rx.Observable.of('58B/uEPvdZ6fK037ob5w9SZofg6KB+oKTZnrwIfqu5Q=');
const CLIENT_ID = Rx.Observable.of('9fbca7c6-36ef-4b83-b9dc-6c117849810a');
const CLIENT_SECRET = Rx.Observable.of('f07fba0a-a9d1-42ac-8bdd-597dd5e11c9f');
const METADATA_URL = Rx.Observable.of('https://console.cloud-elements.com/elements/api-v2/instances/');
// const INSTANCE_ID = Rx.Observable.of(fs.readFileSync('scripts/metadata/marketingInstance.json'))
const INSTANCE_ID = Rx.Observable.of('')
  .map(instanceDoc => JSON.parse(instanceDoc))
  .map(instance => instance.id);

function getAPIInfo() {
  return Rx.Observable.zip(
    CLIENT_ID,
    CLIENT_SECRET,
    CE_ORG_TOKEN,
    CE_USER_SECRET,
    INSTANCE_ID,
    METADATA_URL,
    (clientID, clientSecret, ceOrgToken, ceUserSecret, instanceID, metadataURL) =>
    ({
      clientID,
      clientSecret,
      ceOrgToken,
      ceUserSecret,
      instanceID,
      metadataURL
    }));
}

function fetchFromBackend(operationID) {
  return getAPIInfo()
    .switchMap(apiInfo => Rx.Observable.fromPromise(new Promise((resolve, reject) => {
      url = `${apiInfo.metadataURL}${apiInfo.instanceID}/docs/${operationID}/definitions?discovery=true&resolveReferences=true&basic=true`;
      console.log(url);
      let req = new XMLHttpRequest();
      req.responseType = 'json';
      req.open('GET', url);
      req.setRequestHeader('accept', 'application/json');
      req.setRequestHeader("Authorization", `User ${apiInfo.ceUserSecret}, Organization ${apiInfo.ceOrgToken}`);
      req.onload = () => {
        if (req.status == 200) {
          let data = JSON.parse(req.responseText);
          resolve(data);
        } else {
          reject(new Error(req.statusText));
        }
      };
      req.onerror = () => {
        reject(new Error('IO Error making HTTP call'));
      };
      req.send();
    })));
}



function getOutputSchemaFromPathOld(vendorPath, method, url) {
  return getCEPath(vendorPath)
    .switchMap(ceObject => Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
      .map(docs => JSON.parse(docs))
      .map(docInstance => docInstance.paths[`${ceObject}`][method]['operationId']))
    .switchMap(operationID => Rx.Observable.of(fs.readFileSync('scripts/metadata/marketingInstance.json'))
      .map(instanceDoc => JSON.parse(instanceDoc))
      .map(instance => instance.id)
      .switchMap(instanceID => Rx.Observable.fromPromise(new Promise((resolve, reject) => {
        url = `${url}${instanceID}/docs/${operationID}/definitions?discovery=true&resolveReferences=true&basic=true`;
        console.log(url);
        let req = new XMLHttpRequest();
        req.responseType = 'json';
        req.open('GET', url);
        req.setRequestHeader('accept', 'application/json');
        req.setRequestHeader("Authorization", "User 58B/uEPvdZ6fK037ob5w9SZofg6KB+oKTZnrwIfqu5Q=, Organization HaCt3ayVXo6pPAYsNB9hEhOgdujcXwy7k5DNibD32Es=");
        req.onload = () => {
          console.log("got something");
          if (req.status == 200) {
            let data = JSON.parse(req.responseText);
            resolve(data);
          } else {
            reject(new Error(req.statusText));
          }
        };
        req.onerror = () => {
          reject(new Error('IO Error making HTTP call'));
        };
        req.send();
      }))));

}

function getOutputSchema(vendorPath, method) {
  return getCEPath(vendorPath)
    .switchMap(ceObject => Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
      .map(docs => JSON.parse(docs))
      .map(docInstance => docInstance.paths[`${ceObject}`][method]['operationId']))
    .switchMap(fetchFromBackend)
    .map(response => {
      return {
        $schema: "http://json-schema.org/draft-04/schema#",
        type: "object",
        definitions: {},
        properties: {
          output: {
            type: "object",
            properties: response.definitions[response.responseModel].properties
          }
        }
      }
    });
}


function getSchema(vendorPath, method) {
  const outputIsArray = (docInstance, ceObject, method) => {
    return docInstance.paths[`${ceObject}`][method].responses['200'].schema['items'] !== undefined;
  }

  return getCEPath(vendorPath)
    .do(console.log)
    .switchMap(cePath => Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
      .map(docs => JSON.parse(docs))
      .mergeMap(docInstance => Rx.Observable.from(docInstance.paths[`${cePath}`][method]['parameters'])
        .filter(fdata => fdata.name !== 'Authorization')
        .reduce((acc, value) => {
          value.type ? acc.properties.parameters.properties[value.name] = {
              type: value.type ? value.type : undefined,
              description: value.description
            } :
            value.schema ? acc.properties = {
              body: value.schema
            } : undefined;
          return acc;
        }, {
          properties: {
            parameters: {
              type: "object",
              properties: {}
            }
          },
          cepath: cePath
        })
        .do(sdata => {
          console.log("is This an Array " + outputIsArray(docInstance, cePath, method));
        })
        .mergeMap(schema => method !== 'delete' ?
          resolveOutput(schema, docInstance.paths[`${cePath}`][method]['operationId'], outputIsArray(docInstance, cePath, method)) :
          Rx.Observable.of(schema))
      ));
}

function resolveOutput(schema, operationID, isArray) {
  return fetchFromBackend(operationID)
    .map(opSchema => {
      schema.properties['body'] = opSchema.requestModel ? opSchema.definitions[opSchema.requestModel] : undefined;
      if (isArray) {
        return {
          "items": opSchema.responseModel ? opSchema.definitions[opSchema.responseModel] : undefined,
          "type": "array"
        };
      } else {
        schema.properties['output'] = opSchema.responseModel ? opSchema.definitions[opSchema.responseModel] : undefined;
        return schema;
      }
    });

}

function getTokenIDs() {
  let {
    element: {
      id: elementID
    },
    id: instanceID
  } = JSON.parse(fs.readFileSync('scripts/metadata/marketingInstance.json'))
  console.log(elementID)
  console.log(instanceID)
}

function getAllObjects() {
  return Rx.Observable.of(fs.readFileSync('scripts/metadata/docsMetadata.json'))
    .map(docs => JSON.parse(docs))
    .map(docsInfo => docsInfo.objects);
}



// function objectLiteralTest({
//     id,
//     name
// }) {
//     console.log(id);
//     console.log(name);
// }

// objectLiteralTest({
//     id: 2334,
//     name: "Alice"
// });
// let bobsData = {
//     id: 4454,
//     name: "Bob"
// };

// objectLiteralTest(bobsData);
//getTokenIDs();

// getInputSchema('companies', 'post')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getCEPath('/companies/{accountId}/engagements')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getCEPath('/engagements/{id}')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getCEPath('/contacts/{id}')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getInputSchemaFromPath('/engagements/{id}', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getInputSchemaFromPath('/companies/{accountId}/engagements', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getOutputSchema('/companies/{accountId}/engagements', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getOutputSchema('/companies', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getSchema('/companies', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getSchema('/contacts', 'post')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getSchema('/companies/{id}', 'get')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getSchema('/companies', 'post')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");

// getSchema('/companies/{id}', 'delete')
//     .subscribe(data => {
//         let content = JSON.stringify(data);
//         console.log(content);
//     }),
//     console.log,
//     () => console.log("done");


// getCEObject('companies')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// console.log("====>");

// getVendorObjects()
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getAllVendorPaths()
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getVendorPath('/accounts/{accountId}/activities')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getCEPath('/companies/{accountId}/engagements')
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// console.log("======>");

// getCEObject('engagements')
//     .switchMap(ceObject => getVendorPathsForCEObject(ceObject, 'get'))
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");

// getCEPath('/companies')
//     .switchMap(cepath => getVendorPathsForCEObject(cepath, 'get'))
//     .subscribe(console.log),
//     console.log,
//     () => console.log("done");


// let allRecords = {
//     "properties": {
//         "records": {
//             "items": {},
//             "type": "array"
//         }
//     }, "type": "object"
// };


/////new for pardot

// getAllObjects()
//   .subscribe(console.log),
//   console.log,
//   () => console.log("done");
/*
console.log("====> Paths for Object Campaign Get")

getPathsForObject('campaign', 'get')
  .subscribe(console.log),
  console.log,
  () => console.log("done");

console.log("====> Actions for Object Campaign Get")

getActionsForObject('campaign', 'get')
  .subscribe(console.log),
  console.log,
  () => console.log("done");


console.log("====> Actions for Object Campaign Post")

getActionsForObject('campaign', 'post')
  .subscribe(console.log),
  console.log,
  () => console.log("done");


// getSchemaForPath('/campaigns', 'get')
//   .subscribe(console.log),
//   console.log,
//   () => console.log("done");


//   getSchemaForAction('getCampaigns', 'get')
//   .subscribe(console.log),
//   console.log,
//   () => console.log("done");

// getSchemaForAction('getCampaigns', 'get')
//   .subscribe(console.log),
//   console.log,
//   () => console.log("done");


*/
getSchemaAsJsonString()
  .subscribe(data => {
    let output = `export module JsonSchema {

      export class Types {
    
        public static schemaDoc = () => \`${data}\`
      }
    }`
    console.log(output)
  }),
  console.log,
  () => console.log("done");
