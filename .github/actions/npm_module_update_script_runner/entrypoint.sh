#!/usr/bin/env bash

set -eu

function main() {
    cd ${GITHUB_WORKSPACE}
    if [ -f "${INPUT_SCRIPT_FILE}" ]; then
    	echo "use $(pwd)/${INPUT_SCRIPT_FILE}"
    else
        echo "Invalid path ${INPUT_SCRIPT_FILE}"
        exit 1;
    fi

    bash ${INPUT_SCRIPT_FILE}
}

main
