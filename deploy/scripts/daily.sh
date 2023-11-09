#!/bin/bash

SCRIPT_DIR=$(dirname $(readlink -f $0))
API_DIR=$(readlink -f ${SCRIPT_DIR}/../attendance-api/)

LOG_DIR=${SCRIPT_DIR}/logs
OUTPUT_FILE=${LOG_DIR}/daily.log

if [ ! -d "${LOG_DIR}" ]; then
    mkdir ${LOG_DIR}
fi

# BEGIN REDIRECTED STDOUT, STDERR
(
export PATH=/usr/local/bin:${PATH}

if [ ! -d "${API_DIR}" ]; then
    echo "Error: ${API_DIR} is not a directory"
    exit 1
fi

date --rfc-3339=seconds | tr -d '\n'
echo -e "\\t${0}"

cd ${API_DIR}

php ./artisan meetings:end

echo

) >> ${OUTPUT_FILE} 2>&1

