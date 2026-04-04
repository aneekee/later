#!/usr/bin/env bash

set -e

IMAGE_NAME=later
TAG=latest
CONTAINER_NAME=later-api
PORT=3000

docker run -d \
  --name ${CONTAINER_NAME} \
  -p ${PORT}:${PORT} \
  ${IMAGE_NAME}:${TAG}
