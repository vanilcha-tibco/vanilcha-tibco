#!/bin/bash

# %%...%% strings will be substituted at build time

DOCKER_COMPOSE=${DOCKER_COMPOSE:-'false'}
AWS_DEFAULT_PROFILE=${AWS_S3_PROFILE:-${AWS_DEFAULT_PROFILE:-'vagrant'}}

# In AWS, these will be unset by tci-config.bash, below
PERSONAL_AWS_CREDENTIALS="\
  -v ${HOME}/.aws:/root/.aws \
  -e AWS_DEFAULT_PROFILE=${AWS_DEFAULT_PROFILE} \
  -e AWS_FEDERATED_SETUP=${AWS_FEDERATED_SETUP} \
"
DEVELOPER_SETTINGS="\
  -v ${HOME}/.vagrant.d:/root/.vagrant.d \
  -e DOCKER_COMPOSE=${DOCKER_COMPOSE} \
"

if [ -f "$PWD/tci-config.bash" ]; then
  # This can be used for local overrides, but it is designed for use by deploy-actions.sh,
  #   for AWS overrides.
  source "$PWD/tci-config.bash"
fi

# Defaults are designed for developer use, which is typically interactive.
DTR_ORG='tci'
SOURCE_REGISTRY=${SOURCE_REGISTRY:-${DOCKER_REGISTRY:-"reldocker.tibco.com/$DTR_ORG"}}
TARGET_REGISTRY=${TARGET_REGISTRY:-"tibdocker.tibco.com/$DTR_ORG"}
CLOUDOPS_USERNAME=${CLOUDOPS_USERNAME:-${CLOUDOPS_BASIC_AUTH_USER:-'admin'}}
CLOUDOPS_PASSWORD=${CLOUDOPS_PASSWORD:-${CLOUDOPS_BASIC_AUTH_PWD:-'admin123'}}
TEST_IMAGES_ENABLED=${TEST_IMAGES_ENABLED:-'false'}

# This variable is used in prefixed deployments
DEPLOYMENT_NAME=${DEPLOYMENT_NAME:-""}
# Deployer will write data to the working directory, by default.
#  Override this if you want use an external folder, to keep your Docker build context clean.
DEPLOYER_DATA=${DEPLOYER_DATA:-${PWD}}

IMAGE_TAG='8987'
IMAGE_NAME='tci-deployer'
IMAGE_URL=${IMAGE_URL:-"$SOURCE_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"}
CONTAINER_NAME=${CONTAINER_NAME:-"${DEPLOYMENT_NAME}${IMAGE_NAME}"}

docker rm -f $CONTAINER_NAME >& /dev/null

CMD=${*:-'bash'}
if [ "$CMD" = 'bash' ]; then
   MODE='-it'
   BASHMODE="-i"
fi

DOCKER_NETWORK='tci'

docker network create ${DOCKER_NETWORK} &> /dev/null

docker run ${MODE} --rm \
  --network=${DOCKER_NETWORK} \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ${HOME}/.docker:/root/.docker \
  -v ${DEPLOYER_DATA}:/usr/src \
  -e DOCKER_NETWORK=${DOCKER_NETWORK} \
  -e SOURCE_REGISTRY=${SOURCE_REGISTRY} \
  -e TARGET_REGISTRY=${TARGET_REGISTRY} \
  -e BID=${BID} \
  -e CLOUDOPS_USERNAME=${CLOUDOPS_USERNAME} \
  -e CLOUDOPS_PASSWORD=${CLOUDOPS_PASSWORD} \
  -e DEPLOYMENT_NAME=${DEPLOYMENT_NAME} \
  -e CONTAINER_NAME=${CONTAINER_NAME} \
  -e DEPLOYER_DATA=${DEPLOYER_DATA} \
  ${PERSONAL_AWS_CREDENTIALS} \
  ${DEVELOPER_SETTINGS} \
  ${MOUNT_ECR_LOGIN} \
  ${EXTRA_DOCKER_RUN_ARGS} \
  --name $CONTAINER_NAME \
  $IMAGE_URL bash $BASHMODE -c "reconfigure() { source /opt/deployer/commands-custom/reconfigure.bash; }; reconfigure && $CMD"
