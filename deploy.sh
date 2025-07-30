#!/bin/bash

# Deploy the app to k8s using Kustomize
kubectl apply --kustomize manifests/overlays/localdev --overwrite