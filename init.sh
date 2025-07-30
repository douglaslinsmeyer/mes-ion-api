#!/bin/bash

# Get environment from ENVIRONMENT env var, default to localdev
ENVIRONMENT=${ENVIRONMENT:-localdev}

# Make sure we're running in the local context for localdev
if [[ "${ENVIRONMENT}" == "localdev" ]]; then
    kubectl config use-context docker-desktop
fi

# Build the image
./build.sh

# Deploy to k8s
./deploy.sh

echo ""
echo "MES ION API deployed successfully!"
if [[ "${ENVIRONMENT}" == "localdev" ]]; then
    echo "Access at: http://api.ion.mes.localhost"
    echo "API Docs at: http://api.ion.mes.localhost/api-docs"
fi
echo ""