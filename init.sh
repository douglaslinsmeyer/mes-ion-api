#!/bin/bash

# Make sure we're running in the local context
kubectl config use-context docker-desktop

# Build the image
./build.sh

# Deploy to k8s
./deploy.sh

echo ""
echo "MES ION API deployed successfully"
echo "Access at: http://api.ion.mes.localhost"
echo "API Docs at: http://api.ion.mes.localhost/api-docs"
echo ""