# Mock Server

Servidor Express en memoria para desarrollo y pruebas del frontend.
Todos los datos se pierden al reiniciar — comportamiento esperado.

## Arranque rápido

```bash
cd mock
npm install
npm run dev      # con nodemon (recarga automática)
npm start        # sin recarga
```

Puerto por defecto: **3000**
URL base: `http://localhost:3000/api/v1`
Health check: `GET http://localhost:3000/health`

Superadmin pre-sembrado: definir `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD` en `.env`.
Defaults de desarrollo: `super@methodology.local` / `cambiar-pronto` (fuerza cambio de contraseña al primer login).

## Tests

```bash
npm test            # Jest, una sola ejecución
npm run test:watch  # modo watch
npm run test:coverage
```

## Despliegue en k3s

```bash
# Desde la raíz del repositorio
make mock-dev          # desarrollo local
make k3s-deploy-mock   # despliegue en k3s con overlay mock
```

## Variables de entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `JWT_SECRET` | `mock-jwt-secret-development-only` | Secret JWT. En producción: usar Docker Secret en `/run/secrets/jwt_secret`. |
| `NODE_ENV` | — | Si es `production` con el secret por defecto, el servidor termina con error. |

## Endpoints

Ver `docs/INVENTARIO.md` §5 para la lista completa y actualizada de todos los endpoints.

### Resumen rápido

| Módulo | Rutas principales |
|--------|------------------|
| Auth | `POST /auth/login\|logout\|setup\|password-recovery\|password-reset`, `GET /auth/setup/:token` |
| Usuarios | `POST/GET /users`, `PATCH /users/:id/status`, `PATCH /users/me/password`, `POST /users/:id/reset-password` |
| Sesiones | `GET /users/me/sessions`, `GET /users/:id/sessions`, `DELETE /sessions/:jti` |
| Permisos | `GET/PUT /users/:id/permissions` |
| Audit log | `GET /audit-log` |
| Instrumentos | `POST/GET /instruments`, `GET/PATCH/DELETE /instruments/:id`, `PATCH /instruments/:id/status` |
| Métricas | `POST/GET/PATCH/DELETE /instruments/:id/metrics`, `/instruments/:id/metrics/:metricId` |
| Registro | `POST /projects/:projectId/subjects`, `POST /subjects/:id/context`, `GET /subjects/:id` |
| Aplicaciones | `POST /applications`, `GET /applications/my`, `POST /metric-values` |
| Configuración | `GET/PUT /config/operativo` |

## Notas de seguridad

- El campo `_mock_setup_token` en respuestas de `POST /users` y `POST /users/:id/reset-password` solo existe en el mock. En producción, el token se envía por email.
- `POST /auth/password-recovery` devuelve `_mock_recovery_token` en la respuesta. En producción, se envía por email y no se expone en la API.
- JWT_SECRET por defecto es inseguro y solo apto para desarrollo.
