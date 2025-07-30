#!/bin/bash

# Delete the Kubernetes resources
kubectl delete --kustomize manifests/overlays/localdev --ignore-not-found

# Clean build artifacts
rm -rf dist
rm -rf node_modules
rm -rf coverage

echo "Cleanup complete"