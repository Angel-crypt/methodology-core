# Mock Server – Métricas Lingüísticas

Servidor HTTP en memoria que implementa los contratos MockContract M1–M4.  
Todos los datos se pierden al reiniciar (comportamiento esperado en un mock).

## Estructura

```
mock/
├── responses/          # Contratos XML de referencia (M1–M4)
├── src/
│   ├── index.js        # Entry point
│   ├── store/index.js  # Almacenamiento en memoria
│   ├── middleware/
│   │   └── auth.js     # JWT HS256 + RBAC
│   └── routes/
│       ├── m1.js       # Autenticación y Control de Acceso
│       ├── m2.js       # Gestión de Instrumentos
│       ├── m3.js       # Métricas
│       └── m4.js       # Registro Operativo
├── Dockerfile
├── .env.example
└── package.json
```

## Requisitos

- Node.js 18+

## Instalación y ejecución local

```bash
# Desde la carpeta mock/
npm install
npm start          # producción
npm run dev        # desarrollo con recarga automática (nodemon)
```

El servidor escucha en `http://localhost:3000` por defecto.

## Variables de entorno

Copia `.env.example` a `.env` y ajusta según sea necesario.

| Variable     | Por defecto                          | Descripción               |
|--------------|--------------------------------------|---------------------------|
| `PORT`       | `3000`                               | Puerto de escucha         |
| `JWT_SECRET` | `mock-jwt-secret-development-only`   | Secreto de firma JWT      |

## Credenciales de acceso inicial

| Campo    | Valor               |
|----------|---------------------|
| Email    | `admin@mock.local`  |
| Password | `Admin123!`         |
| Rol      | `administrator`     |

## Endpoints disponibles

Base path: `/api/v1`

### M1 – Autenticación
| Método | Ruta                        | Roles           |
|--------|-----------------------------|-----------------|
| POST   | `/auth/login`               | Público         |
| POST   | `/auth/logout`              | Cualquier rol   |
| POST   | `/users`                    | administrator   |
| GET    | `/users`                    | administrator   |
| PATCH  | `/users/:id/status`         | administrator   |
| PATCH  | `/users/me/password`        | Cualquier rol   |

### M2 – Instrumentos
| Método | Ruta                            | Roles         |
|--------|---------------------------------|---------------|
| POST   | `/instruments`                  | administrator |
| GET    | `/instruments`                  | Cualquier rol |
| PATCH  | `/instruments/:id`              | administrator |
| PATCH  | `/instruments/:id/status`       | administrator |

### M3 – Métricas
| Método | Ruta           | Roles         |
|--------|----------------|---------------|
| POST   | `/metrics`     | administrator |
| GET    | `/metrics`     | Cualquier rol |
| PATCH  | `/metrics/:id` | administrator |

> `GET /metrics` requiere query param `?instrument_id=<UUID>`

### M4 – Registro Operativo
| Método | Ruta                        | Roles                        |
|--------|-----------------------------|------------------------------|
| POST   | `/subjects`                 | applicator, administrator    |
| POST   | `/subjects/:id/context`     | applicator, administrator    |
| GET    | `/subjects/:id`             | Cualquier rol                |
| POST   | `/applications`             | applicator, administrator    |
| POST   | `/metric-values`            | applicator, administrator    |

### Salud
| Método | Ruta      | Autenticación |
|--------|-----------|---------------|
| GET    | `/health` | Ninguna       |

## Ejemplo de flujo completo

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mock.local","password":"Admin123!"}'

# Guarda el access_token devuelto como TOKEN

# 2. Crear instrumento
curl -X POST http://localhost:3000/api/v1/instruments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Instrumento A","start_date":"2026-01-01","end_date":"2026-12-31"}'

# 3. Crear métrica
curl -X POST http://localhost:3000/api/v1/metrics \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"instrument_id":"<UUID>","name":"Comprensión","metric_type":"numeric","required":true,"min_value":0,"max_value":100}'

# 4. Registrar sujeto (body vacío)
curl -X POST http://localhost:3000/api/v1/subjects \
  -H "Authorization: Bearer $TOKEN"

# 5. Registrar aplicación
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"subject_id":"<SUBJECT_UUID>","instrument_id":"<INSTRUMENT_UUID>"}'

# 6. Capturar valores
curl -X POST http://localhost:3000/api/v1/metric-values \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"application_id":"<APP_UUID>","values":[{"metric_id":"<METRIC_UUID>","value":85}]}'
```

## Docker

```bash
# Construir imagen
docker build -t methodology-mock .

# Ejecutar
docker run -p 3000:3000 methodology-mock
```
