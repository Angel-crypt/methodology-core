# Mock Server

Servidor mock para pruebas funcionales del frontend.

## Requisitos

- Node.js 20+
- npm

## Ejecutar local

```bash
cd mock
npm install
npm run dev
```

## Ejecutar en modo estable

```bash
cd mock
npm start
```

## Despliegue en k3s

El modo mock se activa con el overlay `deploy/k3s/overlays/mock`.
No requiere archivo `.env` para secretos.

Desde raiz tambien puedes usar:

```bash
make mock-install
make mock-dev
make k3s-deploy-mock
```
