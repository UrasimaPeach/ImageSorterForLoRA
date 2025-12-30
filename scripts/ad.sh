#!/bin/sh

USERID=`id -u`
GROUPID=`id -g`
docker compose exec -u "${USERID}:${GROUPID}" image_sorter_for_lora bash
