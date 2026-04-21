# Decisiones Técnicas y Arquitectónicas

Documento autocontenible que fundamenta las decisiones técnicas, de seguridad y arquitectónicas del Sistema de Captura y Trazabilidad de Datos Académicos (SCTDA).

---

## 1) Principios rectores del sistema

### 1.1 Privacy by Design

El sistema implementa privacidad desde la arquitectura:

- **Anonimización estructural:** el sujeto recibe un código anónimo generado por el sistema; no se usa identificador personal.
- **Minimización:** solo se captura lo necesario para el análisis metodológico.
- **Separación identidad–métricas:** la tabla de identidad y la tabla de registros operativos están separadas y solo se vinculan por clave técnica.
- **Acceso restringido por rol:** cada usuario solo ve lo que su rol permite.

### 1.2 Security by Design

- **Zero Trust:** ninguna request es trusted por defecto. Cada solicitud valida autenticación, autorización y estado.
- **Defense in depth:** múltiples capas de seguridad (red, aplicación, base de datos).
- **Principio de menor privilegio:** cada componente tiene solo los permisos necesarios.
- **Auditoría completa:** todo evento sensible deja rastro.

### 1.3 Zero Trust aplicado

El sistema implementa Zero Trust en 6 pasos para cada request:

1. Token JWT válido (firma, expiración).
2. JTI no revocado.
3. Usuario existe y está activo.
4. Token version coincide (invalida sesiones tras cambios críticos).
5. Consistencia temporal (pwd_changed_at).
6. Rol tiene permiso para el endpoint.

---

## 2) Decisiones de tecnología de backend

### 2.1 API Framework: FastAPI vs Django vs Flask

| Criterio | FastAPI | Django | Flask |
|----------|---------|--------|-------|
| Performance | ⭐⭐⭐ (async nativo) | ⭐⭐ (sincrónico) | ⭐⭐ ( depende implementación) |
| Documentación automática | ⭐⭐⭐ (OpenAPI built-in) | ⭐⭐ (DRF opcional) | ⭐ (manual) |
| type hints | ⭐⭐⭐ (nativo) | ⭐⭐ (opcional) | ⭐ (manual) |
| Curva de aprendizaje | ⭐⭐ (moderada) | ⭐⭐⭐ (empinada) | ⭐⭐ (suave) |
| Ecosistema | ⭐⭐ (en crecimiento) | ⭐⭐⭐ (maduro) | ⭐⭐⭐ (gran ecosistema) |

**Decisión:** **FastAPI**

**Fundamento:**
- Rendimiento async nativo para alta concurrencia.
- Documentación automática OpenAPI reduce fricción.
- Type hints natales mejoran mantenibilidad.
- Ligero pero extensible.

### 2.2 ORM: SQLAlchemy async vs alternatives

| Criterio | SQLAlchemy async | Prisma | TypeORM |
|-----------|------------------|--------|---------|
| Async nativo | ✅ | ✅ | ✅ |
| Tipado | ⭐⭐⭐ (mypy) | ⭐⭐⭐ (TS) | ⭐⭐ (TS parcial) |
| Flexibilidad SQL | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Madurez | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Decisión:** **SQLAlchemy 2.0 async**

**Fundamento:**
- Control fino sobre SQL generado.
- Soporte async first-class.
- Integración nativa con Pydantic.
- Madurez probada en producción.

### 2.3 Base de datos: PostgreSQL

**Decisión:** **PostgreSQL**

**Fundamento:**
- Robustez y madurez.
- Soporte para tipos complejos (JSON, arrays).
- Excelente rendimiento para datos relacionales.
- Herramientas de migración (Alembic) integradas.

---

## 3) Decisiones de tecnología de frontend

### 3.1 Framework: React + Vite vs Next.js vs Angular

| Criterio | React + Vite | Next.js | Angular |
|----------|--------------|---------|---------|
| Performance | ⭐⭐⭐ (SPA ligera) | ⭐⭐ (SSR overhead) | ⭐⭐ (bundle size) |
| Curva de aprendizaje | ⭐⭐ (React) | ⭐⭐⭐ (más conceptos) | ⭐⭐⭐ (empinada) |
| SEO | ⭐ (SPA) | ⭐⭐⭐ (SSR) | ⭐ (no es objetivo) |
| Complejidad | ⭐⭐ (mínima) | ⭐⭐⭐ (más configuración) | ⭐⭐⭐ (RxJS, DI) |

**Decisión:** **React + Vite**

**Fundamento:**
- SPA es suficiente (no se necesita SEO para sistema interno autenticado).
- Vite ofrece HMR rápido y build optimizado.
- Ecosistema maduro de componentes (Radix UI).
- Simplicidad de arquitectura.

### 3.2 State Management: Context API vs Redux vs Zustand

**Decisión:** **Context API**

**Fundamento:**
- Suficiente para la complejidad del sistema.
- Menos boilerplate que Redux.
- Zustand requiere aprendizaje adicional sin beneficio claro para este scope.

---

## 4) Decisiones de infraestructura y despliegue

### 4.1 Contenedores: Docker

**Decisión:** **Docker** (multi-stage builds)

**Fundamento:**
- Portabilidad asegurada.
- Multi-stage para optimizar tamaño de imagen.
- Comunidad y tooling maduros.

### 4.2 Orquestación: K3s vs Docker Swarm vs ECS

| Criterio | K3s | Docker Swarm | ECS |
|----------|-----|-------------|-----|
| Recursos | ⭐⭐ (lightweight) | ⭐⭐ (ligero) | ⭐ (gestionado AWS) |
| Complejidad | ⭐⭐ (moderada) | ⭐ (simple) | ⭐⭐ (AWS-specific) |
| Kubernetes compatible | ✅ | ❌ | ❌ |
| comunidad | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

**Decisión:** **K3s**

**Fundamento:**
- Kubernetes-compatible sin overhead de un cluster completo.
- Ideal para homelab o cluster pequeño.
- Ansible integrado para automatización.

### 4.3 CI/CD: GitHub Actions

**Decisión:** **GitHub Actions** (tests + lint)

**Estado actual:**
- CI: ✅ tests + lint para frontend y mock
- CD: ❌ no hay pipeline de despliegue

**Nota:** CD no implementado por limitaciones de infraestructura.

---

## 5) Decisiones de seguridad

### 5.1 Autenticación: JWT vs Sesiones

| Criterio | JWT | Sesiones servidor |
|-----------|-----|-------------------|
| Escalabilidad | ⭐⭐⭐ (stateless) | ⭐⭐ (stateful) |
| Revocación | ⭐⭐ (requiere lista) | ⭐⭐⭐ (inmediata) |
| Storage | ⭐⭐⭐ (client-side) | ⭐⭐ (server-side) |

**Decisión:** **JWT** con revocación persistente

**Fundamento:**
- JWT permite arquitectura stateless.
- Revocación implementada via tabla `revoked_tokens`.
- Token version permite invalidación global.

### 5.2 Hash de contraseñas: bcrypt

**Decisión:** **bcrypt** (cost=12)

**Fundamento:**
- Resistencia a rainbow tables.
- Costo configurable.
- Ampliamente auditado.

### 5.3 Rate limiting

**Decisión:** **Redis + slowapi**

**Fundamento:**
- Backend shared state para contar intentos.
- Protección efectiva contra brute force.
- Configurable por endpoint.

---

## 6) Trade-offs y alternativas descartadas

### 6.1 No usar Django

**Razón:** Overhead innecesario para API REST. El sistema no necesita admin panel, ORM complejo ni autenticación built-in.

### 6.2 No usar Next.js

**Razón:** SSR no es necesario para una aplicación interna autenticada. Agrega complejidad sin beneficio para este caso.

### 6.3 No usar Kubernetes completo

**Razón:** K8s completo es overkill para un sistema monothic con 3 servicios. K3s ofrece lo necesario con menos recursos.

### 6.4 No usar autenticación basada en sesiones

**Razón:** JWT es más simple de escalar y no requiere store de sesiones en redis para el token mismo.

### 6.5 No usar encryption at rest en MVP

**Razón:** MVP prioriza funcionalidad sobre cifrado de datos. Encryption at rest es mejora de fase 2.

---

## 7) Modelo de calidad de dato (GIGO prevention)

El sistema previene **Garbage In, Garbage Out** mediante:

1. **Validaciones en captura (Frontend + Backend)**
   - Tipos enforceados (number, boolean, categorical, short_text)
   - Rangos configurables (min_value, max_value)
   - Campos obligatorios vs opcionales por instrumento

2. **Validaciones en persistencia**
   - Schemas Pydantic con validación de entrada
   - Constraints de base de datos

3. **Contexto estructurado obligatorio**
   - Cada registro requiere: instrumento, proyecto, sujeto anónima, contexto educativo, aplicación

4. **Trazabilidad y auditoría**
   - Actor, instrumento, timestamp, versión del instrumento
   - Cambios en configuración no invalidan registros históricos

---

## 8) Resumen de principios de decisión

| Principio | Aplicación |
|-----------|-----------|
| Simplicidad suficiente | FastAPI + React SPA + K3s |
| Seguridad por diseño | Zero Trust + RBAC + auditoría |
| Privacidad por diseño | Separación identidad-métricas + anonimización |
| Escalabilidad razonable | JWT stateless + PostgreSQL |
| Mantenibilidad | Type hints + separación capas + tests |

---

## 9) Marco Legal y Documentos de Cumplimiento

El sistema opera bajo un marco legal de tres capas (distinguidas explícitamente para evitar confusión):

### 9.1 Licencia de Software (LICENSE)

| Aspecto | Detalle |
|--------|---------|
| Licencia | MIT License |
| Archivo | `LICENSE` en raíz del repositorio |
| Alcance | Código fuente del sistema (software) |
| NO cubre | Datos de investigación ni datasets |
| Titular | Equipo académico responsable del proyecto |

**Distinción crítica:** La licencia MIT aplica al software, no a los datos. El Aviso de Privacidad y los Términos de Servicio rigen exclusivamente los datos de investigación.

### 9.2 Términos y Condiciones de Uso

| Aspecto | Detalle |
|--------|---------|
| Documento | `mock/src/data/terms-of-service.js` |
| Versión | v1.1 |
| Fecha | 2026-04-21 |
| Marco | Leyes de los Estados Unidos Mexicanos |
| Jurisdicción | Tribunales competentes de la Ciudad de México |

**Contenido cubierto:**
- Uso exclusivo por invitación (no auto-registro).
- Prohibiciones explícitas (compartir credenciales, acceso fuera de rol, etc.).
- Propiedad intelectual del software diferenciada de los datos del proyecto.
- Terminación por incumplimiento o inactividad (12 meses).

### 9.3 Aviso de Privacidad (LFPDPPP)

| Aspecto | Detalle |
|--------|---------|
| Documento | `mock/src/data/privacy-notice.js` |
| Versión | v1.2 |
| Fecha | 2026-04-21 |
| Marco | Ley Federal de Protección de Datos Personales en Posesión de los Particulares |
| Derechos | ARCO (Acceso, Rectificación, Cancelación, Oposición) |

**Protecciones implementadas:**
- Datos de usuarios operativos: nombre, correo institucional, teléfono (opcional), rol.
- Sujetos de estudio: **sin identificación personal** (UUID automático, contexto genérico).
- No se almacenan CURP, RFC, dirección ni datos identificables directos.
- Revocación de consentimiento sin afectar registros anonimizados de sujetos de estudio.

**Nota sobre cookies:** El sistema **no utiliza** cookies de rastreo, publicidad ni analítica de terceros. Almacenamiento local se elimina al cerrar sesión.

---

## 10) Referencias cruzadas

- **ficha-tecnica.md:** Alcance funcional, contexto de proyecto, defensa ante tribunal de profesores.
- **arquitectura.md:** Detalle técnico de implementación, seguridad, gaps.
- **decisiones-tecnicas.md (este documento):** Fundamentos de decisiones técnicas, de seguridad y marco legal.
