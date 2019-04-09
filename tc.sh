
docker logout $DOCKER_REGISTRY
docker login -u $DOCKER_REGISTRY_USERNAME -p $DOCKER_REGISTRY_PASSWORD $DOCKER_REGISTRY || exit $?

docker volume prune -f

export SOURCE_REGISTRY=$DOCKER_REGISTRY/tci

tcbuildno=$(printf "%02d" ${BUILD_COUNTER})
version=$(./scripts/cicd/build.sh GetProperty VERSION properties.sh)
vld=$(./scripts/cicd/build.sh GetProperty VBUILDNO properties.sh)
vbuildno=$(printf "%02d" ${vld})
legacy=$(./scripts/cicd/build.sh GetProperty LEGACY_BUILD properties.sh)

imageTag="${version}-V${vbuildno}"

>&1 echo "##teamcity[buildNumber '${BRANCH_NAME}_${imageTag}-${BID}']"

[ -d artifacts ] || mkdir artifacts

echo "Image Tag is ${imageTag}"

if [ "${legacy}" = "true" ]; then
    echo "*** Building in legacy format ***"
    echo "Running NPM Install ..."
    # ./scripts/cicd/build.sh NPMInstall
    ./scripts/cicd/build.sh NPMInstallCICD
    echo "Running fe-cli to generate code and to convert it to legacy format"
    # ./fe-cli-d.sh compile --prod true && ./scripts/cicd/build.sh RunLegacyFormatConverter
    ./scripts/cicd/build.sh CopyToLegacyFormat && ./scripts/cicd/build.sh RunLegacyFormatConverter
    cd dist && ./tci-deployer.sh wi-contributions build -noso -t ${imageTag} || exit $?
    echo "Pushing legacy built image $DOCKER_REGISTRY$DOCKER_ORG ${imageTag}"
    ./tci-deployer.sh wi-contributions push $DOCKER_REGISTRY$DOCKER_ORG ${imageTag} || exit $?
    cd ..
else
    echo "*** Building in standard format ***"
    ./tci-deployer.sh wi-contributions pull-docs -u $AD_USERNAME -p $AD_PASSWORD  # let it fail silently for now
    ./tci-deployer.sh wi-contributions build -noso -t ${imageTag} || exit $?
    echo "Pushing standard built image $DOCKER_REGISTRY$DOCKER_ORG ${imageTag}"
    ./tci-deployer.sh wi-contributions push $DOCKER_REGISTRY$DOCKER_ORG ${imageTag} || exit $?
fi

# ./mochaTests.sh Setup
# echo "sleeping for 5 seconds"
# sleep 5
# echo "sleeping for another 5 seconds"
# sleep 5
# ./scripts/database/setup.sh Setup
# ./mochaTests.sh Run
# ./scripts/database/setup.sh Destroy
# ./mochaTests.sh Destroy

./scripts/cicd/build.sh EC::Build ${vbuildno} $AD_USERNAME $AD_PASSWORD

./scripts/cicd/build.sh GenerateJiraJson $AD_USERNAME $AD_PASSWORD ${vbuildno}
./scripts/cicd/build.sh CopyProperties
./scripts/cicd/build.sh UpdateProperty TC_BUILDNO ${tcbuildno} artifacts/build.properties
./scripts/cicd/build.sh CompressArtifacts
./scripts/cicd/build.sh UploadArtifacts

docker logout $DOCKER_REGISTRY