#!/bin/bash
BRANCH_NAME="-${BRANCH_NAME}"
#docker run --rm -ti -v $PWD:/src -v $PWD/src/app:/gobuild/src -e GOPATH=/gobuild reldocker.tibco.com/tci/tci-flogo-cli:latest $@
docker run --rm -i -v ${HOME}/.flogo/login/.netrc:/root/.netrc -v $PWD:/src -v $PWD/src/app:/gobuild/src -e GOPATH=/gobuild reldocker.tibco.com/tci/tci-flogo-cli:latest $@

# look at the .netrc file at the root of the project. Update the file with git repo name, username and password and put it under ${HOME}/.flogo/login. The credentials in this
# file will be used during the build at the time when it does a `got get` to fetch code from private git repositories like git.tibco.com. This will avoid compilation/resolution errors
# you may see with your shared code needs to be downloaded (go get) but the builder could not fetch it because it does not have the credentials to do so.  