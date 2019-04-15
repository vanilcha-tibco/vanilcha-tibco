#! /bin/bash


function contrib::stage {
    tempdir=${1:-staging}
    
    if [ ! -d "${tempdir}" ]; then
        mkdir -p ${tempdir}
    fi
    #trap "$(which rm) -rf $tempdir" EXIT
    
    sources="src/app/PostgreSQL/activity
    src/app/PostgreSQL/connector
    src/app/PostgreSQL/vendor
    src/app/PostgreSQL/postgres.go
    scripts/tci-deployer.sh
    scripts/properties.sh
    src/app/PostgreSQL/contribution.json"
    
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
    mkdir -p ${tempdir}/activity/postgres
    mkdir -p ${tempdir}/connector/postgres
    
    cp -r src/app/postgres/activity/* ${tempdir}/activity/postgres
    cp src/app/postgres/postgres.go ${tempdir}/activity/postgres
    cp -r src/app/postgres/connector/connection/* ${tempdir}/connector/postgres
}

function contrib::filter {
    tempdir=${1:-staging}
    
    if [ ! -d "${tempdir}" ]; then
        echo "${tempdir} does not exist, aboring zip operation" >&2
        exit 128
    fi
    
    [ -e ${tempdir}/components ] && rm -rf ${tempdir}/components

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
    replace='this.category = "postgres"'
    with='this.category = "postgres"'
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

function tci::adjustGoPaths {
    
    replace='wi-postgres.git\/src\/app\/postgres'
    with='wi-postgres.git\/activity\/postgres'
    
    sources="$(find . \( -iname '*.go' \))"
    for file in ${sources}
    do
        echo transforming $file
        for lineno in $( grep -n "$replace" $file | cut -d: -f1 )
        do
            echo "$lineno in $file"
            sed -i "" "$lineno s/$replace/$with/" $file
        done
    done
    
}


function contrib::adjustGoPaths {
    
    replace='wi-postgres.git\/src\/app\/postgres'
    with='wi-postgres.git\/PostgreSQL'
    
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
    node scripts/jsonUpdate.js --file wi-plugins/activity/postgres/query/activity.json --category postgres --ref git.tibco.com/git/product/ipaas/wi-plugins.git/activity/postgres/query
    node scripts/jsonUpdate.js --file wi-plugins/connector/postgres/connector.json --smallicon icons/ic-postgres.png --largeicon icons/ic-postgres@2x.png --category postgres --ref git.tibco.com/git/product/ipaas/wi-plugins.git/connector/postgres
    
    #       // obj.display.smallIcon = "icons/ic-postgres.png";
    #   // obj.display.largeIcon = "icons/ic-postgres@2x.png"
    
    tci::zip
}

"$@"

#sources="$(find . \( -iname *.go -o -iname *.ts \))"



