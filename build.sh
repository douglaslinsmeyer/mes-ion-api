#!/bin/bash

# Set image name for ION API
REGISTRY_NAME="mes-ion-api"
IMAGE_NAME="local-dev"

# Build the image and tag it for local development
docker build -f Dockerfile . -t "pingisappdev/${REGISTRY_NAME}:${IMAGE_NAME}" \
   --target development \
   --build-arg BUILD_CONFIGURATION=Debug

echo "Built image: pingisappdev/${REGISTRY_NAME}:${IMAGE_NAME}"