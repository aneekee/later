#!/usr/bin/env bash

set -e

IMAGE_NAME=later
TAG=latest

docker build -f ./apps/api/Dockerfile.prod -t ${IMAGE_NAME}:${TAG} .
