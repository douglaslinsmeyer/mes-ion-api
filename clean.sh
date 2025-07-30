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

echo "Cleaning MES ION API from environment: ${ENVIRONMENT}"

# Delete the Kubernetes resources
kubectl delete --kustomize "manifests/overlays/${ENVIRONMENT}" --ignore-not-found

# Clean build artifacts (only for localdev)
if [[ "${ENVIRONMENT}" == "localdev" ]]; then
    echo "Cleaning build artifacts..."
    rm -rf dist
    rm -rf node_modules
    rm -rf coverage
fi

echo "Cleanup complete"