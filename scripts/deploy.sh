#! /bin/bash

function genSchema {
    sed -i "/\$id/d" scripts/metadata/docsMetadata.json
}


function contrib::stage {
    tempdir=${1:-staging}
    
    if [ ! -d "${tempdir}" ]; then
        mkdir -p ${tempdir}
    fi
    #trap "$(which rm) -rf $tempdir" EXIT
    
    sources="src/app/AzureServiceBus/connector
    src/app/AzureServiceBus/activity
    src/app/AzureServiceBus/trigger
    src/app/AzureServiceBus/vendor
    src/app/AzureServiceBus/azservicebus.go
    scripts/tci-deployer.sh
    scripts/properties.sh
    src/app/AzureServiceBus/contribution.json"
    
    for file in ${sources}
    do
        echo "copying file ${file} into ${tempdir} "
        cp -r ${file} ${tempdir}
    done
}

function tci::stage {
    tempdir=${1:-wi-plugins}
    [ -d ${tempdir} ] && rm -rf ${tempdir} && mkdir ${tempdir}
    
    #trap "$(which rm) -rf $tempdir" EXIT
    mkdir -p ${tempdir}/activity/AzureServiceBus
    mkdir -p ${tempdir}/connector/AzureServiceBus
    mkdir -p ${tempdir}/trigger/AzureServiceBus
    mkdir -p ${tempdir}/vendor/AzureServiceBus
    
    cp -r src/app/AzureServiceBus/activity/* ${tempdir}/activity/AzureServiceBus
    cp src/app/AzureServiceBus/azservicebus.go ${tempdir}/activity/AzureServiceBus
    cp -r src/app/AzureServiceBus/connector/connection/* ${tempdir}/connector/AzureServiceBus
    cp -r src/app/AzureServiceBus/trigger/* ${tempdir}/trigger/AzureServiceBus
    cp -r src/app/AzureServiceBus/vendor/* ${tempdir}/vendor/AzureServiceBus
}

function contrib::zip {
    tempdir=${1:-staging}
    
    if [ ! -d "${tempdir}" ]; then
        echo "${tempdir} does not exist, aboring zip operation" >&2
        exit 128
    fi
    
    [ -e contribution.zip ] && rm contribution.zip
    projDir=$(pwd)
    #cd ${tempdir}
    echo "creating contribution.zip file"
    zip -r ${projDir}/contribution.zip ${tempdir}
    #cd ${projDir}
    
    if [ "$?" -ne 0 ]; then
        echo "contribution zip creation was unsuccessful" >&2
    fi
}

function tci::zip {
    tempdir=${1:-wi-plugins}
    
    if [ ! -d "${tempdir}" ]; then
        echo "${tempdir} does not exist, aboring zip operation" >&2
        exit 128
    fi
    
    [ -e wi-plugins.zip ] && rm wi-plugins.zip
    projDir=$(pwd)
    #cd ${tempdir}
    echo "creating wi-plugins.zip file"
    zip -r ${projDir}/wi-plugins.zip ${tempdir}
    #cd ${projDir}
    
    if [ "$?" -ne 0 ]; then
        echo "wi-plugins zip creation was unsuccessful" >&2
    fi
}

function contrib::transform {
    for lineno in $( grep -n "@deploy" $1 | cut -d: -f1 )
    do
        echo "$lineno in $1"
        next="$(( $lineno + 1 ))"
        sed -i "$lineno s/\/\/ @deploy//" $1
        sed -i "${next} s/^/\/\/ @undeploy/" $1
    done
}

function tci::replaceTsCategory {
    replace='this.category = "AzureServiceBus"'
    with='this.category = "AzureServiceBus"'
    sources="$(find . \( -iname '*.ts' \))"
    
    for file in ${sources}
    do
        echo transforming $file
        for lineno in $( grep -n "$replace" $file | cut -d: -f1 )
        do
            echo "$lineno in $file"
            sed -i "$lineno s/$replace/$with/" $file
        done
    done
}

## use like ../scripts/deploy.sh migrate AzureServiceBus '*.ts'

function migrate {
    local replace=$1
    local with=$2
    local extension="$3"
    local dryrun=${4:-false}

    [ $dryrun = true ] && echo "===>executing dryrun"
    echo $extension
    echo "migrating from $replace to $with"

    sources="$(find . \( -iname "$extension" -not -path "./node_modules*" -not -path "./wi-studio*" -not -path "./scripts*" \) )"
    for file in ${sources}
    do
        # replace within file first
        echo migrating $file
        for lineno in $( grep -n "$replace" $file | cut -d: -f1 )
        do
            echo "$lineno in $file"
            [ $dryrun = false ] && sed -i "$lineno s/$replace/$with/" $file
        done
    done
    # now change the file names to the new name
    sources="$(find . \( -iname "$extension" \) | grep $replace)"
    for file in ${sources}
    do
        echo -n renaming file $file
        local renamed=$(echo $file | sed s/$replace/$with/)
        echo " to $renamed"
        [ $dryrun = false ] && mv $file $renamed
        # now change the file name
    done
}

function tci::adjustGoPaths {
    
    replace='wi-azservicebus.git\/src\/app\/AzureServiceBus'
    with='wi-azservicebus.git\/src\/app\/AzureServiceBus'
    
    sources="$(find . \( -iname '*.go' \))"
    for file in ${sources}
    do
        echo transforming $file
        for lineno in $( grep -n "$replace" $file | cut -d: -f1 )
        do
            echo "$lineno in $file"
            [ "$(uname -s)" == "Darwin" ] && sed -i "" "$lineno s/$replace/$with/" $file
            [ "$(uname -s)" == "Linux" ] && sed -i "$lineno s/$replace/$with/" $file
        done
    done
    
}


function contrib::adjustGoPaths {
    
    replace='wi-azservicebus.git\/src\/app\/AzureServiceBus'
    with='wi-azservicebus.git\/src\/app\/AzureServiceBus'
    
    sources="$(find . \( -iname '*.go' \))"
    for file in ${sources}
    do
        echo transforming $file
        for lineno in $( grep -n "$replace" $file | cut -d: -f1 )
        do
            echo "$lineno in $file"
            [ "$(uname -s)" == "Darwin" ] && sed -i "" "$lineno s/$replace/$with/" $file
            [ "$(uname -s)" == "Linux" ] && sed -i "$lineno s/$replace/$with/" $file
        done
    done
    
}


function contrib::copyDeployer {
    tempdir=${1:-staging/AzureServiceBus}
    
    if [ ! -d "${tempdir}" ]; then
        mkdir -p ${tempdir}
    fi
    #trap "$(which rm) -rf $tempdir" EXIT
    
    sources="scripts/tci-deployer.sh
    scripts/properties.sh"
    
    for file in ${sources}
    do
        echo "copying file ${file} into ${tempdir} "
        cp -r ${file} ${tempdir}
    done
}

function contribZip {
    rm -rf staging
    contrib::stage
    cd staging
    contrib::adjustGoPaths
    cd ..
    contrib::zip
}

function tciZip {
    rm -rf wi-plugins
    tci::stage
    cd wi-plugins
    if [ "$?" -ne 0 ]; then
        echo "unable to go into wi-plugins dir" >&2
        exit
    fi
    tci::replaceTsCategory
    tci::adjustGoPaths
    cd ..
    node scripts/jsonUpdate.js --file wi-plugins/activity/AzureServiceBus/publish/activity.json --category AzureServiceBus --ref git.tibco.com/git/product/ipaas/wi-plugins.git/activity/AzureServiceBus/query
    node scripts/jsonUpdate.js --file wi-plugins/trigger/AzureServiceBus/query/activity.json --category AzureServiceBus --ref git.tibco.com/git/product/ipaas/wi-plugins.git/activity/AzureServiceBus/query
    node scripts/jsonUpdate.js --file wi-plugins/connector/AzureServiceBus/connector.json --smallicon icons/ic-AzureServiceBus.png --largeicon icons/ic-AzureServiceBus@2x.png --category AzureServiceBus --ref git.tibco.com/git/product/ipaas/wi-plugins.git/connector/AzureServiceBus
    
    #       // obj.display.smallIcon = "icons/ic-zoho.png";
    #   // obj.display.largeIcon = "icons/ic-zoho@2x.png"
    
    tci::zip
}

"$@"

#sources="$(find . \( -iname *.go -o -iname *.ts \))"



