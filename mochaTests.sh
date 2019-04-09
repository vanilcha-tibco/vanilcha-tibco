#! /bin/bash

# TBD: later use docker compose or docker machine

function Setup() {
    echo "no mocha tests to setup"
}

function Destroy() {
    echo "no mocha test to destroy"
}

function Run() {
    echo "no mocha test to run"
    # docker run --rm -i -e NODE_ENV=docker --entrypoint node_modules/mocha/bin/mocha -v $PWD:/src reldocker.tibco.com/tci/tci-flogo-cli:latest -r ts-node/register src/tests/**/*.spec.ts --reporter json | tee artifacts/mocha.json
}

"$@"
