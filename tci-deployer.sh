#!/bin/bash

if [ -f "$PWD/tci-config.bash" ]; then
  # This can be used for local overrides, but it is designed for use by tci-actions.sh,
  #   for AWS overrides.
  source "$PWD/tci-config.bash"
fi

# Defaults are designed for developer use, which is typically interactive.
AWS_DEFAULT_PROFILE=${AWS_S3_PROFILE:-${AWS_DEFAULT_PROFILE:-'vagrant'}}
SOURCE_REGISTRY=${SOURCE_REGISTRY:-${DOCKER_REGISTRY:-"reldocker.tibco.com/tci"}}
TARGET_REGISTRY=${TARGET_REGISTRY:-'tibdocker.tibco.com/tci-test'}
TCI_CLOUDOPS_USERNAME=${TCI_CLOUDOPS_USERNAME:-${CLOUDOPS_BASIC_AUTH_USER:-'admin'}}
TCI_CLOUDOPS_PASSWORD=${TCI_CLOUDOPS_PASSWORD:-${CLOUDOPS_BASIC_AUTH_PWD:-'admin123'}}
TEST_IMAGES_ENABLED=${TEST_IMAGES_ENABLED:-'false'}

# This variable is used in multi TCI hosting
TCI_DEPLOYMENT_NAME=${TCI_DEPLOYMENT_NAME:-""}
# tci-deployer will write data to the working directory, by default.
#  Override this if you want use an external folder, to keep your Docker build context clean.
TCI_DATA=${TCI_DATA:-${PWD}}

FLOGO_EDITION=${FLOGO_EDITION:-'TCI'}
FLOGO_ENTERPRISE=${FLOGO_ENTERPRISE:-'false'}
FE_DEPLOYMENT=${FE_DEPLOYMENT:-'monolith'} 

TCI_IMAGE_TAG='7929'    # will be substituted at build time
TCI_IMAGE_NAME='tci-deployer'  # will be substituted at build time
TCI_IMAGE_URL=${TCI_IMAGE_URL:-"$SOURCE_REGISTRY/$TCI_IMAGE_NAME:$TCI_IMAGE_TAG"}
TCI_CONTAINER_NAME=${TCI_CONTAINER_NAME:-"${TCI_DEPLOYMENT_NAME}${TCI_IMAGE_NAME}"}

docker rm -f $TCI_CONTAINER_NAME >& /dev/null

CMD=${*:-'bash'}
if [ "$CMD" = 'bash' ]; then
   MODE='-it'
   BASHMODE="-i"
fi

DOCKER_NETWORK=tci
if [ "$FLOGO_ENTERPRISE" == 'true' ]; then
   DOCKER_NETWORK=tibco
fi

docker network create ${DOCKER_NETWORK} &> /dev/null

docker run ${MODE} --rm \
	--network=${DOCKER_NETWORK} \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ${HOME}/.aws:/root/.aws \
  -v ${HOME}/.docker:/root/.docker \
  -v ${HOME}/.vagrant.d:/root/.vagrant.d \
  -v ${TCI_DATA}:/usr/src \
  ${MOUNT_ECR_LOGIN} \
  -e FLOGO_ENTERPRISE=${FLOGO_ENTERPRISE} \
  -e FLOGO_EDITION=${FLOGO_EDITION} \
  -e FE_DEPLOYMENT=${FE_DEPLOYMENT} \
  -e DOCKER_NETWORK=${DOCKER_NETWORK} \
  -e AWS_DEFAULT_PROFILE=${AWS_DEFAULT_PROFILE} \
  -e SOURCE_REGISTRY=${SOURCE_REGISTRY} \
  -e TARGET_REGISTRY=${TARGET_REGISTRY} \
  -e BID=${BID} \
  -e TCI_CLOUDOPS_USERNAME=${TCI_CLOUDOPS_USERNAME} \
  -e TCI_CLOUDOPS_PASSWORD=${TCI_CLOUDOPS_PASSWORD} \
  -e TCI_DEPLOYMENT_NAME=${TCI_DEPLOYMENT_NAME} \
  -e TCI_CONTAINER_NAME=${TCI_CONTAINER_NAME} \
  -e TCI_DATA=${TCI_DATA} \
  -e TEST_IMAGES_ENABLED=${TEST_IMAGES_ENABLED} \
  ${EXTRA_DOCKER_RUN_ARGS} \
  --name $TCI_CONTAINER_NAME \
  $TCI_IMAGE_URL bash $BASHMODE -c "reconfigure() { source /opt/deployer/commands/reconfigure.bash; }; reconfigure && $CMD"