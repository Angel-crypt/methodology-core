# Frontend

React 18 + Vite + React Router v6. SPA que consume la API REST del mock (desarrollo) o el backend real (producción).

## Arranque rápido

```bash
cd frontend
npm install
npm run dev    # Puerto 5173, proxy /api/v1 → localhost:3000
```

En desarrollo, `/api/v1` se redirige automáticamente al mock server (ver `vite.config.js`).

## Comandos

```bash
npm run dev          # Servidor de desarrollo con HMR
npm run build        # Build de producción (dist/)
npm run lint         # ESLint
npm test             # Vitest (una ejecución)
npm run test:watch   # Vitest en modo watch
npm run test:coverage
```

## Tests

Framework: **Vitest** + React Testing Library + MSW (Mock Service Worker).

- Setup global: `src/test/setup.js`
- Handlers de API para tests: `src/test/handlers.js`
- Tests unitarios: `src/__tests__/`

## Estructura

```
src/
├── pages/           # Una página por ruta (ver docs/INVENTARIO.md 4)
├── components/
│   └── app/         # Design system: botones, modales, tablas, etc.
├── services/        # Llamadas a la API REST
├── layouts/
│   └── AppLayout.jsx  # Shell con Sidebar
├── styles/
│   └── tokens/      # Variables CSS (colores, espaciado, tipografía)
├── test/            # Setup MSW compartido entre tests
└── __tests__/       # Tests por módulo
```

## Variables de entorno

El frontend solo usa variables `VITE_*` (expuestas en build time). En desarrollo no se necesita ninguna — el proxy de Vite redirige a `localhost:3000`.

## Despliegue

El build se empaqueta como imagen Docker y se despliega en k3s:

```bash
# Desde la raíz del repositorio
make frontend-install
make frontend-dev
make k3s-deploy-mock   # modo mock (sin backend real)
make k3s-deploy-real   # modo producción
```

Ver `docs/INVENTARIO.md` para descripción completa de todas las páginas, rutas y componentes.
