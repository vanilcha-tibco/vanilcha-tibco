#!/bin/bash
# %%...%% strings will be substituted at build time

# Deployer will write data to the working directory, by default.
#  Override this if you want use an external folder, to keep your Docker build context clean.
DEPLOYER_DATA=${DEPLOYER_DATA:-${PWD}}

#detect environment type in order to mount file-system and reset to vendor specific setting

# Deployer will write data to the working directory, by default.
#  Override this if you want use an external folder, to keep your Docker build context clean.
DEPLOYER_DATA=${DEPLOYER_DATA:-${PWD}}

detectEnvironment() {
    # Default is set to 'vagrant'
    if [ -n "$(curl -s --fail --connect-timeout 5 http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null)" ]; then
        IAAS_VENDOR='aws'
	TCI_MOUNT="\
        -v /data/tcicomputes:/data/tcicomputes \
        "
	developerSetting
    elif [ -n "$(curl -s --fail --connect-timeout 5 -H Metadata:true "http://169.254.169.254/metadata/instance?api-version=2017-08-01" 2>/dev/null)" ]; then
        IAAS_VENDOR='azure'
	cp /usr/local/bin/tropmgr ${DEPLOYER_DATA}
	cp /usr/local/bin/docker-credential-acr-linux ${DEPLOYER_DATA}  
  AZURE_CREDENTIALS="-v ${HOME}/.azure:/root/.azure"
  
	TCI_MOUNT="\
        -v /data/tcicomputes:/data/tcicomputes \
        "
    else
        # Default is set to 'vagrant'
        IAAS_VENDOR='vagrant'
	vagrant version > /dev/null
	if [ $? != 0 ]; then
	  echo -e "Assuming Non-vagrant local environment since controller VM is not running\n"
	  TCI_MOUNT=""
	else
          TCI_SOURCE_LOCATION=$(vagrant global-status --prune | grep controller | awk '{print$5}')
          CONTROLLER_STATUS=$(vagrant global-status --prune | grep controller | awk '{print$4}')
          [[ $CONTROLLER_STATUS != 'running' ]] && TCI_MOUNT="" || \
          TCI_MOUNT="\
           -v $TCI_SOURCE_LOCATION:/vagrant \
          "
        fi
        developerSetting
    fi
}

# In AWS, these will be unset by tci-config.bash, below
developerSetting() {
   AWS_DEFAULT_PROFILE=${AWS_S3_PROFILE:-${AWS_DEFAULT_PROFILE:-'vagrant'}}
   export PERSONAL_AWS_CREDENTIALS="\
      -v ${HOME}/.aws:/root/.aws \
      -v ${HOME}/.ssh:/root/.ssh \
      -e AWS_DEFAULT_PROFILE=${AWS_DEFAULT_PROFILE} \
      -e AWS_FEDERATED_SETUP=${AWS_FEDERATED_SETUP} \
      "
   export AZURE_SETTINGS="\
      -v ${HOME}/.azure:/root/.azure \
      "
   export DEVELOPER_SETTINGS="\
      -v ${HOME}/.vagrant.d:/root/.vagrant.d \
      -e DOCKER_COMPOSE=${DOCKER_COMPOSE:-'false'} \
      -e CONTROLLER_IP=${CONTROLLER_IP:-10.245.1.2} \
      "
}

RECONFIGURE="reconfigure() { \
  if [ -f /opt/deployer/commands-custom/reconfigure.bash ]; then \
    source /opt/deployer/commands-custom/reconfigure.bash; \
  else \
    source /opt/deployer/commands/reconfigure.bash; \
  fi \
}; reconfigure"

detectEnvironment

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

IMAGE_TAG='12943'
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
  -e IAAS_VENDOR=${IAAS_VENDOR} \
  -e CLOUDOPS_USERNAME=${CLOUDOPS_USERNAME} \
  -e CLOUDOPS_PASSWORD=${CLOUDOPS_PASSWORD} \
  -e DEPLOYMENT_NAME=${DEPLOYMENT_NAME} \
  -e CONTAINER_NAME=${CONTAINER_NAME} \
  -e DEPLOYER_DATA=${DEPLOYER_DATA} \
  ${TCI_MOUNT}\
  ${AZURE_CREDENTIALS}\
  ${AZURE_SETTINGS} \
  ${PERSONAL_AWS_CREDENTIALS} \
  ${DEVELOPER_SETTINGS} \
  ${MOUNT_ECR_LOGIN} \
  ${EXTRA_DOCKER_RUN_ARGS} \
  --name $CONTAINER_NAME \
  $IMAGE_URL bash $BASHMODE -c "$RECONFIGURE && $CMD"
