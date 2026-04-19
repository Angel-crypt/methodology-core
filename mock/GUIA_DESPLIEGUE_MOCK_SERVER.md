# Guia de Despliegue Mock Server (k3s)

## Requisitos

- k3s activo
- `kubectl` configurado
- Secret `methodology-secrets` creado

## Desplegar modo mock

```bash
kubectl apply -k deploy/k3s/overlays/mock
kubectl -n methodology get pods
```

## Acceso

- Frontend: `http://localhost`
- Mock API (host): `http://mock-api.localhost`

## Notas

- En mock se desactivan backend, keycloak, postgres, redis y haproxy.
- Los secretos se gestionan como Kubernetes Secret.
