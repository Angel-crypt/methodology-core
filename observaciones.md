# Evaluación Final — Taller de Proyecto Orientado a Centros de Datos y Redes
**Asignatura:** FI41 | **Ciclo:** 8.º cuatrimestre | **Docente:** Omar Francisco Velázquez Juárez
**Proyecto evaluado:** Sistema de Registro Metodológico de Métricas Lingüísticas
**Repositorio:** `Angel-crypt/methodology-core`
**Fecha de análisis:** 2026-04-22

---

## 1. Participación del Equipo

Fuente: historial de commits en rama `main` (git log --no-merges). Se identificaron 5 autores distintos más 1 alias del autor principal (mismo email con noreply de GitHub). Total de commits: **495**.

| Autor (alias git) | Correo | Commits | Área principal de contribución |
|---|---|---:|---|
| Angel-crypt / Crypt / Angel Cruz | angel.cruz.030905@gmail.com | **476** | Líder técnico. Frontend completo (páginas, hooks, servicios, design system, tests), mock server (rutas M1–M6, middleware, store), documentación técnica (SRS, INVENTARIO, BITACORA, ESTADO_CONSOLIDADO), infraestructura (Makefile, docker-compose), CI |
| GoldenDiegos | gu26ie0006@globaluniversity.edu.mx | **10** | M2 frontend inicial (AppLayout, Sidebar, LoginPage, instruments service, GestionInstrumentos); un commit posterior con módulo Backend-M1-Auth en FastAPI (`Backend-M1-Auth/`) |
| abdy | abdyn.7@gmail.com | **6** | Guías del mock server (2 commits, marzo); backend FastAPI real M1 Auth: modelos ORM, schemas Pydantic, repositorio, AuthService, router, JWT, dependencias (4 commits, abril) |
| KaraIbr | k210240.i@gmail.com | **2** | Un commit con documentos legales (`AvisoPrivacidad.md`, `license.md`); un commit de "login frontend" que subió `node_modules/` accidentalmente (requirió limpieza posterior con `git rm --cached`) |
| Arjonaleo | gu23ia0002@globaluniversity.edu.mx | **1** | Wizard de Registro Operativo completo: `RegistroOperativoWizardPage.jsx` (739 líneas, M4 HU14–HU17) |

**Observación sobre participación:** El equipo tiene una distribución marcadamente asimétrica. Angel-crypt concentra el 96 % de los commits y prácticamente la totalidad del trabajo técnico medular. Los demás miembros tienen contribuciones puntuales y de alcance limitado. KaraIbr introduce un artefacto problemático (node_modules committeado) que requirió corrección por otro miembro del equipo. Esta distribución es un dato objetivo del historial; su interpretación y peso en la calificación individual queda a criterio del docente.

---

## 2. Tabla de Calificación — Evaluación Final

Escala: **2** = Cumple completamente | **1.0–1.9** = Cumple parcialmente | **0** = No cumple / ausente
Calificación (0–10) por criterio = puntaje (0–2) × 5

| # | Criterio | Puntaje (0–2) | Calificación (0–10) | Observaciones (resumen) |
|---|---|:---:|:---:|---|
| 1 | Arquitectura del sistema (DC/Redes) coherente y justificable | 2.0 | **10.0** | K3s con 13 componentes, HA en PostgreSQL, Redis, Keycloak OIDC, diagramas documentados |
| 2 | IaC/automatización (repo funcional, despliegue reproducible) | 2.0 | **10.0** | Ansible 5 playbooks, Kustomize overlays, Makefile 15+ targets, docker-compose, migration-job |
| 3 | Seguridad (controles aplicados y justificados) | 1.5 | **7.5** | Mock: controles sólidos y justificados. Backend real: cifrado, OIDC y audit log son stubs |
| 4 | Observabilidad (métricas/logs/tableros o evidencia equivalente) | 1.3 | **6.5** | structlog JSON presente, health check, audit log endpoint; sin Prometheus ni dashboards |
| 5 | Pruebas (carga, fallas, DR o validaciones; evidencia) | 1.3 | **6.5** | 76 tests frontend/mock en CI verde; backend tests y Locust todos NotImplementedError |
| 6 | Calidad técnica del repositorio (estructura, documentación, versionado) | 1.9 | **9.5** | Estructura limpia, documentación extensa y viva, commits convencionales, CI, tooling |
| 7 | Presentación (claridad, orden, tiempo) | 1.5 | **7.5** | Errores ortográficos en el póster, distribución de los contenidos, validación de los elementos. Está bien usar IA, pero esto nos lleva a ser más estrictos en la calidad de los contenidos. |
| 8 | Defensa (respuestas técnicas, decisiones y trade-offs) | 1.5 | **7.5** | Las respuestas grupales, especialmente en el área técnica, presentaron huecos en el contenido y falta de entendimiento de la solución técnica presentada. Está bien el uso de la IA, pero debemos entonces ser más precisos como arquitectos al entender lo que le estamos pidiendo. |
| | **Promedio de los 8 criterios** | **1.63** | **8.13** | (10.0+10.0+7.5+6.5+6.5+9.5+7.5+7.5) / 8 |
| | **Calificación Defensa** | | **9** | El uso de términos técnicos y el manejo de arquitecturas deben mejorarse. Todos deben prepararse mejor antes de la presentación de un proyecto; la defensa requiere que todo el equipo esté sintonizado y en pleno entendimiento de lo que están entregando. |
| | **Total D** | | **8.56** | (8.13 + 9) / 2 |

---

## 3. Desarrollo de Observaciones por Criterio

---

### Criterio 1 — Arquitectura del sistema (DC/Redes) coherente y justificable · **2.0/2**

**Evidencia encontrada:**

El proyecto despliega sobre k3s (Kubernetes ligero) en el namespace `methodology` con los siguientes componentes definidos en `deploy/k3s/base/`:

- **Capa de aplicación:** Frontend (Nginx + SPA React), Backend FastAPI (2 réplicas), Mock Server (Express), Keycloak (IdP OIDC)
- **Capa de datos:** PostgreSQL primario (PVC 5 Gi), PostgreSQL réplica, PostgreSQL dedicado para Keycloak, Redis master, Redis réplica
- **Capa de red/balanceo:** HAProxy para alta disponibilidad de PostgreSQL (ConfigMap con la configuración en `configmap-haproxy.yaml`), Ingress para exposición externa

Existen dos overlays de Kustomize:
- `overlays/real`: todos los componentes activos, con migración de base de datos como K8s Job
- `overlays/mock`: backend, Keycloak, PostgreSQL y Redis en réplicas 0; solo frontend + mock-server activos

La arquitectura está documentada en `docs/architecture/ARQUITECTURA_DESPLIEGUE.md` con tres diagramas Mermaid: topología real, overlay mock y flujo de despliegue con Ansible.

Los roles de la arquitectura están justificados: Redis para revocación de JTI de tokens; HAProxy para HA de base de datos; réplica PostgreSQL para disponibilidad de lectura; Keycloak para delegación de autenticación OIDC (researcher/applicator) con JWT propio para superadmin.

**Inconsistencia menor documentada:** El README principal (línea 57) declara "Backend: Node.js + Express" cuando el backend real es FastAPI/Python. No es un error arquitectónico, pero es una inconsistencia de documentación.

**Conclusión:** La arquitectura es coherente con los requerimientos del sistema y justificada en la documentación. Demuestra comprensión de conceptos de centro de datos: HA, replicación, separación de capas, gestión de secretos, namespace isolation.

---

### Criterio 2 — IaC/automatización (repo funcional, despliegue reproducible) · **2.0/2**

**Evidencia encontrada:**

**Ansible** (`ansible/`): 5 playbooks para el ciclo de vida completo:
1. `install-k3s-server.yml` — instala el nodo servidor k3s
2. `install-k3s-agents.yml` — une nodos agente al clúster
3. `configure-kubeconfig.yml` — obtiene kubeconfig local
4. `create-k8s-secrets.yml` — crea el Secret `methodology-secrets` en Kubernetes
5. `deploy-k3s.yml` — aplica overlay con Kustomize, ejecuta job de migración, espera completación

Soporta dos topologías documentadas: single-node y cluster (1 server + N agents), con inventarios separados en `ansible/inventories/`.

**Kustomize** (`deploy/k3s/`): base + overlays `mock` y `real`. La separación permite desplegar el entorno de desarrollo (solo frontend + mock) o producción completa sin duplicar manifiestos.

**Makefile**: 15 targets explícitos y documentados (`make help` imprime descripción de cada uno). Cubre instalación de dependencias, desarrollo local, lint, tests y todos los comandos k3s.

**Docker Compose** (`docker-compose.yml`): entorno de desarrollo local con mock + frontend, health check en mock, dependencia explícita `condition: service_healthy`.

**Scripts** (`scripts/create-k8s-secret.sh`): provisión rápida del Secret sin Ansible para iteración manual.

**Migration Job** (`deploy/k3s/base/migration-job.yaml`): ejecuta `alembic upgrade head` como K8s Job, automatizado en el playbook de despliegue con espera de completación (`kubectl wait --for=condition=complete --timeout=180s`).

**Conclusión:** El despliegue es completamente reproducible desde cero. Un operador nuevo puede seguir los comandos del README o el Ansible README y replicar el entorno completo. El Makefile funciona como interfaz única para todas las operaciones.

---

### Criterio 3 — Seguridad (controles aplicados y justificados) · **1.5/2**

**Evidencia de controles implementados:**

**Gestión de secretos (backend real + K8s):**
- Todos los pods (backend, postgres-primary, postgres-keycloak) reciben secretos montados como archivos en `/run/secrets/*`, nunca como variables de entorno en producción. Evidencia: `deploy/k3s/base/backend.yaml` líneas 36–73. La función `_load_jwt_secret()` en `backend/app/core/security.py` lee el archivo primero; solo cae a env var como fallback de desarrollo.
- El Secret de Kubernetes `methodology-secrets` concentra 10 claves: contraseñas de DB, Redis, JWT, master encryption key, Keycloak client secret.

**Generación de contraseñas temporales (mock server):**
- CSPRNG con `crypto.randomBytes()` — delega al SO (`getrandom()` en Linux). Justificación documentada en BITACORA.md sección 10 (AD-16).
- Rejection sampling (`cryptoRandIndex`) para eliminar sesgo de módulo.
- Fisher-Yates shuffle con CSPRNG para que los caracteres requeridos no aparezcan siempre en posiciones fijas.
- Charset de 61 caracteres sin ambiguos; entropía ≈ 95.8 bits. Decisión documentada y justificada.

**Autenticación y control de acceso:**
- Magic link con `secrets.token_urlsafe(32)`, almacenado como hash SHA-256 en base de datos (`backend/app/api/v1/auth/service.py` líneas 43–44). Single-use validado (línea 60). TTL configurable.
- RBAC en mock: middleware verifica rol antes de cada endpoint protegido.
- RBAC en backend: dependencia `require_superadmin` en `backend/app/dependencies.py`.
- Modelo de tres estados de usuario: `pending` / `active` / `disabled`, con protección para no deshabilitar al último superadmin activo.
- Rate limiting en mock: 5 intentos fallidos → bloqueo 5 minutos.
- JTI revocation: implementado en mock (Map en memoria) y backend (tabla `revoked_tokens` en PostgreSQL).
- El administrador **nunca provee ni conoce** la contraseña del usuario al crearla — generación server-side (AD-17, justificado en BITACORA).

**Controles ausentes o incompletos en backend real:**

| Componente | Archivo | Estado |
|---|---|---|
| Cifrado de datos sensibles (AES-256-GCM + HKDF) | `backend/app/core/encryption.py` | `NotImplementedError` — stub vacío |
| Integración OIDC/Keycloak (link_user, disable_user) | `backend/app/core/keycloak.py` | `NotImplementedError` — stub vacío |
| Modelo AuditLog y registro de eventos | `backend/app/db/models/audit_log.py` | Stub vacío, sin columnas ni lógica |
| TLS/HTTPS en Ingress | `deploy/k3s/base/` | Sin configuración TLS en el Ingress |
| Rate limiting en backend real | N/A | No implementado |

**Conclusión:** Los controles en el mock server están bien implementados y justificados en la documentación del equipo. La infraestructura de K8s maneja secretos correctamente. Sin embargo, tres controles críticos del backend real (cifrado en reposo, integración OIDC, audit log) son stubs sin implementar, lo que significa que la capa de producción carece de controles que el equipo sí documentó en su diseño.

---

### Criterio 4 — Observabilidad (métricas/logs/tableros o evidencia equivalente) · **1.3/2**

**Evidencia encontrada:**

**Logging estructurado:**
- `backend/app/core/logging.py`: configura `structlog` con procesadores: `merge_contextvars`, `TimeStamper(fmt="iso", utc=True)`, `add_log_level`, `JSONRenderer()`. Output a stdout. Esta configuración produce logs JSON con timestamp ISO y nivel, compatibles con agregadores como Loki, ELK o CloudWatch Logs.
- El backend llama `configure_logging()` en `app/main.py` antes de iniciar.

**Audit log en mock:**
- Endpoint `GET /audit-log` en mock server con filtros por evento, `user_id`, rango de fechas.
- Frontend tiene `AuditLogPage` con visualización de eventos.
- Almacenamiento **solo en memoria** — se pierde al reiniciar el mock. No hay persistencia.

**Health check:**
- `GET /health` en mock server: retorna `{ status: "ok", service, timestamp }`.

**Lo que no existe:**
- Sin endpoint `/metrics` en el backend (sin Prometheus, sin OpenMetrics).
- Sin configuración de Grafana, Prometheus, Loki ni ninguna herramienta de observabilidad en `deploy/k3s/`.
- Sin alertas definidas.
- Sin APM (Application Performance Monitoring).
- Sin trazabilidad distribuida (OpenTelemetry, Jaeger, etc.).
- `backend/app/scheduler.py` existe pero está vacío; `main.py` tiene un TODO comentado para APScheduler.

**Conclusión:** El equipo tiene la base de observabilidad correcta (logging estructurado JSON en el backend), que es el primer pilar de observabilidad en sistemas modernos. Sin embargo, los otros dos pilares —métricas y trazas— están ausentes, y no existe ninguna herramienta de visualización ni alertas. La observabilidad es funcional a nivel de desarrollo pero insuficiente para un entorno de producción.

---

### Criterio 5 — Pruebas (carga, fallas, DR o validaciones; evidencia) · **1.3/2**

**Evidencia encontrada:**

**Tests funcionales (implementados y operativos):**

*Frontend — Vitest (33 tests):*
- 14 archivos de test en `frontend/src/__tests__/pages/`: LoginPage, SystemLoginPage, AuthCallbackPage, GestionInstrumentos, DetalleUsuarioPage, InstitutionsPage, OnboardingPage, ProjectDetailPage, ProjectsPage, RegistroOperativoWizardPage, SuperadminProfileConfigPage, TermsPage, MisRegistrosPage, MisUsuariosPage.
- 2 archivos en `frontend/src/__tests__/services/`: auth.test.js, instruments.test.js.
- Usan RTL (React Testing Library) + MSW (Mock Service Worker) para simular respuestas de API.

*Mock server — Jest (43 tests):*
- 11 archivos en `mock/src/__tests__/routes/`: auth, instruments, metrics, subjects, applications, export, magicLink, oidc, projects, emailChangeRequest, instruments_cf029.
- Cubren contratos de API del mock (rutas, códigos HTTP, estructura de respuestas).

*CI (GitHub Actions):*
- `.github/workflows/test.yml`: dos jobs paralelos (frontend Vitest + mock Jest) en push/PR a `main` y `dev`.
- Badge de CI presente en README: `[![Tests](https://github.com/Angel-crypt/methodology-core/actions/workflows/test.yml/badge.svg?branch=main)]`.
- INVENTARIO.md declara: "76 tests, todos en verde (43 mock + 33 frontend, tras Sprint 1)".

**Tests definidos pero NO implementados:**

| Archivo | Tipo | Estado |
|---|---|---|
| `backend/tests/unit/auth/test_auth.py` | Unitario backend | `raise NotImplementedError` en todos los métodos |
| `backend/tests/integration/auth/test_auth.py` | Integración backend | `raise NotImplementedError` en todos los métodos |
| `backend/tests/contract/test_contracts.py` | Contrato | `raise NotImplementedError` |
| `backend/tests/performance/locustfile.py` | Carga (Locust) | `raise NotImplementedError` en las 5 clases (AuthenticatedUser, AdminFlow, PermissionCheck, PermissionCheckCacheMiss, ConcurrentDataAccess) |

**DR (Disaster Recovery):** No existe documentación ni prueba de recuperación ante desastres. La arquitectura tiene réplica de PostgreSQL, pero no hay procedimiento de failover documentado ni probado.

**Conclusión:** El proyecto demuestra una cultura de testing aplicada al mock y al frontend, con CI automatizado y cobertura razonable de páginas y rutas de API. Sin embargo, el backend real carece completamente de tests ejecutables, y los tests de carga (Locust) y de contrato están scaffolded sin implementar. No hay evidencia de pruebas de fallo o DR.

---

### Criterio 6 — Calidad técnica del repositorio (estructura, documentación, versionado) · **1.9/2**

**Evidencia encontrada:**

**Estructura:**
```
methodology-core/
├── frontend/       # React SPA — páginas, componentes, servicios, tests
├── backend/        # FastAPI — app, tests, migrations, docs
├── mock/           # Express mock server — rutas, middleware, store, tests
├── ansible/        # Playbooks de IaC
├── deploy/k3s/     # Manifiestos Kubernetes (base + overlays)
├── docs/           # Documentación técnica y funcional
├── scripts/        # Scripts auxiliares
├── .github/        # CI/CD
└── Makefile        # Interfaz unificada de comandos
```
La separación de capas es limpia y predecible.

**Documentación:**
- `README.md`: descripción del sistema, arquitectura, inicio rápido, estructura del proyecto, estado actual, convención de commits.
- `docs/INVENTARIO.md` (336 líneas): fuente de verdad del estado del proyecto — módulos, roles, páginas, endpoints, design system, testing, problemas conocidos.
- `docs/ESTADO_CONSOLIDADO.md`: estado ejecutivo por módulo, pendientes categorizados por prioridad (P0–P3).
- `docs/architecture/ARQUITECTURA_DESPLIEGUE.md`: diagramas Mermaid, componentes, secretos, procedimientos.
- `docs/srs/`: 7 archivos SRS (General + M1–M6), documentación de requerimientos funcionales y no funcionales.
- `BITACORA.md`: registro de decisiones arquitectónicas (AD-11 a AD-17), correcciones y cambios importantes con justificación.
- `docs/contributing/commit_conventions.md`: convención de commits definida.
- `docs/decisiones-tecnicas.md`, `docs/ficha-tecnica.md`: documentación de diseño.
- `backend/README.md`, `mock/README.md`, `ansible/README.md`, `frontend/README.md`: cada submódulo tiene su propio README.

**Versionado:**
- 495 commits con convención `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` aplicada consistentemente.
- Ramas `main` y `dev` con CI en ambas.
- Tags de versión en nombres de archivos SRS (v1.0, v2.0, v2.2).

**Calidad de código:**
- Python: `ruff` (linter/formatter) + `mypy` (tipado estático) configurados, `pre-commit` hooks documentados.
- JavaScript: ESLint configurado en frontend y mock.
- Design system con tokens CSS centralizados (`--color-*`, `--space-*`, `--typography-*`).
- `uv` como gestor moderno de dependencias Python.

**Inconsistencias menores registradas:**
1. README línea 57: "Backend: Node.js + Express" → es FastAPI/Python (error de documentación, no arquitectónico).
2. README líneas 95/97: typos `mkae frontend-install` y `make mocke-install`.
3. `encryption.py`, `keycloak.py`, `audit_log.py` son stubs con `# TODO` — archivos presentes en repo pero sin implementación.
4. `GestionAplicadores.jsx` y `GestionInvestigadores.jsx` son código duplicado (documentado como P-03 pendiente).
5. Commit 53a15a6 (KaraIbr) subió `node_modules/` — requirió limpieza. Indica falta de `.gitignore` activo en ese momento en esa rama.

**Conclusión:** El repositorio presenta un nivel de organización y documentación consistente con proyectos profesionales. La documentación está activa y actualizada (última actualización de INVENTARIO: 2026-04-08). Las inconsistencias encontradas son menores y no comprometen la comprensibilidad ni la reproducibilidad del proyecto.

---

## 4. Cálculo de Calificación Final del Curso — Escenario C (50/50)

| Componente | Valor | Peso | Subtotal |
|---|---|---|---|
| Defensa del proyecto (grupal) | 8.56 | 80 % | **6.85** de 8.0 |
| Certificacion | 1 o 0 | 20 % | TBD |
| **Calificación Final F (0–10)** | | 100 % | **por alumno** |
