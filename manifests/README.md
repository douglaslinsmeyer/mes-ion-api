# MES ION API Kubernetes Manifests

This directory contains Kubernetes manifests for deploying the MES ION API using Kustomize.

## Structure

```
manifests/
├── base/                    # Base Kubernetes resources
│   ├── deployment_template.yaml
│   ├── service.yaml
│   ├── routes_template.yaml
│   ├── configmap.yaml
│   └── kustomization.yaml
└── overlays/               # Environment-specific overlays
    └── localdev/           # Local development configuration
        ├── kustomization.yaml
        ├── *-patch.yaml    # Various patches for local dev
        └── ion-api-secrets.yaml
```

## Local Development Deployment

1. **Configure ION API Credentials**
   ```bash
   cp manifests/overlays/localdev/ion-api-secrets.yaml manifests/overlays/localdev/ion-api-secrets-actual.yaml
   # Edit ion-api-secrets-actual.yaml with your actual ION API credentials
   ```

2. **Deploy to Kubernetes**
   ```bash
   ./init.sh
   ```

3. **Access the API**
   - API: http://api.ion.mes.localhost
   - API Docs: http://api.ion.mes.localhost/api-docs
   - Health: http://api.ion.mes.localhost/health

## Manual Deployment Steps

```bash
# Build Docker image
./build.sh

# Deploy using Kustomize
kubectl apply --kustomize manifests/overlays/localdev

# Check deployment status
kubectl get pods -l app=mes-ion-api
kubectl logs -l app=mes-ion-api

# Clean up
./clean.sh
```

## Development Features

The localdev overlay includes:
- Single replica for development
- Volume mounts for hot reload
- Node.js debugger on port 9229
- Init container for npm install
- Development environment variables

## Debugging

Connect to the Node.js debugger:
```bash
kubectl port-forward deployment/mes-ion-api 9229:9229
```

Then connect your debugger to `localhost:9229`.

## Troubleshooting

1. **Pod not starting**: Check logs with `kubectl logs -l app=mes-ion-api`
2. **ION API authentication failing**: Verify credentials in the secret
3. **Host not resolving**: Add to `/etc/hosts`:
   ```
   127.0.0.1 api.ion.mes.localhost
   ```