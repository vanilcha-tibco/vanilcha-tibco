#!/bin/bash
echo "################ Downloading wi-studio SDK (${BRANCH_NAME:-master}) #############"
[ -d wi-studio ] && rm -rf wi-studio 
mkdir -v wi-studio \
&& pushd wi-studio \
&& { \
     curl -sS "http://llbuild2.na.tibco.com:8080/guestAuth/repository/download/Atmosphere_Tci_Wi_WiStudioApi/.lastSuccessful/flogo-enterprise-studio.tar.gz?branch=${BRANCH_NAME:-master}" | tar -xz  || \
     { \
        echo "Branch: ${BRANCH_NAME} not found for wi-studio-API using master";
        curl -sS "http://llbuild2.na.tibco.com:8080/guestAuth/repository/download/Atmosphere_Tci_Wi_WiStudioApi/.lastSuccessful/flogo-enterprise-studio.tar.gz?branch=<default>" | tar -xz ; \
     } \
 } \
&& popd \
&& [ -d wi-studio ] && ls -al wi-studio \
&& echo "#################################################################################"
