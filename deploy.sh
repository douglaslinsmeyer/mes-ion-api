#!/bin/bash

# Get environment from ENVIRONMENT env var, default to localdev
ENVIRONMENT=${ENVIRONMENT:-localdev}

# Validate environment
if [[ ! -d "manifests/overlays/${ENVIRONMENT}" ]]; then
    echo "Error: Unknown environment '${ENVIRONMENT}'"
    echo "Available environments:"
    ls -1 manifests/overlays/
    exit 1
fi

echo "Deploying to environment: ${ENVIRONMENT}"

# Deploy the app to k8s using Kustomize
kubectl apply --kustomize "manifests/overlays/${ENVIRONMENT}" --overwrite