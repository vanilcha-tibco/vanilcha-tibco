#!/bin/bash

CMD=${1:-automation}
if [ "$CMD" == 'bash' ]; then
   MODE='-it'
fi

registry=${TROPOS_SOURCE_REGISTRY:-reldocker.tibco.com/troposphere}

echo '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
echo "      Updating docker-build"
echo '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
docker pull $registry/docker-build || exit $?
docker rmi docker-build:latest
docker tag $registry/docker-build docker-build || exit $?
docker rmi $registry/docker-build || exit $?

echo '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
echo "      Running docker-build"
echo '%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%'
docker run ${MODE} --rm \
  -e BID=${BID} \
  -e DOCKER_REGISTRY=${DOCKER_REGISTRY} \
  -e DOCKER_API_VERSION=1.18 \
  -v ${HOME}/.docker:/root/.docker \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ${PWD}:/usr/src \
  --name docker-build \
  docker-build $CMD || exit $?
