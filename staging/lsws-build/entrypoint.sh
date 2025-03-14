#!/bin/bash
LSDIR='/usr/local/lsws'

if [ -z "$(ls -A -- "${LSDIR}/conf/")" ]; then
	cp -R ${LSDIR}/.conf/* ${LSDIR}/conf/
fi
if [ -z "$(ls -A -- "${LSDIR}/admin/conf/")" ]; then
	cp -R ${LSDIR}/admin/.conf/* ${LSDIR}/admin/conf/
fi
if [ ! -e ${LSDIR}/conf/serial.no ] && [ ! -e ${LSDIR}/conf/license.key ]; then
    rm -f ${LSDIR}/conf/trial.key*
    wget -P ${LSDIR}/conf/ http://license.litespeedtech.com/reseller/trial.key
fi
chown 1000:1000 ${LSDIR}/conf/ -R
chown 1000:1000 ${LSDIR}/admin/conf/ -R
chown 1000:1000 ${LSDIR}/admin/tmp/ -R

ls -la ${LSDIR}/admin
ls -la ${LSDIR}/admin/tmp

/usr/local/lsws/bin/lswsctrl start
$@
while true; do
	if ! ${LSDIR}/bin/lswsctrl status | grep 'litespeed is running with PID *' > /dev/null; then
		break
	fi
	sleep 60
done
