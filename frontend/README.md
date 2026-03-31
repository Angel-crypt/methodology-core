# Frontend

Frontend React + Vite del sistema.

## Requisitos

- Node.js 20+
- npm

## Desarrollo local

```bash
cd frontend
npm install
npm run dev
```

## Build

```bash
cd frontend
npm run build
```

## Lint

```bash
cd frontend
npm run lint
```

## Nota de despliegue

El despliegue en contenedores se realiza desde `deploy/k3s/` en el repositorio raiz.
Las variables `VITE_*` se definen como argumentos de build de la imagen frontend.

Desde raiz tambien puedes usar:

```bash
make frontend-install
make frontend-dev
```
