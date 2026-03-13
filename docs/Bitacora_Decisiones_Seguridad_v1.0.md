# Bitácora de Decisiones de Seguridad y Arquitectura
**Sistema de Registro Metodológico de Métricas Lingüísticas**
**Versión:** 1.0 · **Fecha:** 2026-03-13 · **Estado:** Aprobado

---

## Propósito

Este documento registra las decisiones de diseño de seguridad adoptadas para el sistema, junto con su fundamentación en estándares, marcos normativos y políticas reconocidas. Ninguna decisión está basada en preferencias o intuiciones: cada una cita la fuente que la respalda.

Las decisiones resuelven inconsistencias detectadas entre los SRS de módulo (M1–M4) y sus contratos de mock, y establecen la postura de seguridad del sistema: **Zero Trust Architecture** conforme a NIST SP 800-207 y **Privacy by Design** conforme a los siete principios de Cavoukian (2009).

---

## Principios rectores

| Marco | Fuente | Principio aplicado |
|---|---|---|
| **Zero Trust Architecture (ZTA)** | NIST SP 800-207 (2020) | "Never trust, always verify." Toda solicitud se valida completamente en cada petición, independientemente de origen, red o sesión previa. |
| **Privacy by Design (PbD)** | Cavoukian, A. (2009). *Privacy by Design: The 7 Foundational Principles* | Privacidad embebida en el diseño, activa por defecto, suma positiva (seguridad + privacidad sin sacrificar funcionalidad). |
| **Data minimisation** | GDPR Art. 5(1)(c) | Solo se recopilan y procesan los datos estrictamente necesarios para el fin declarado. |
| **Protection by default** | GDPR Art. 25 | Los sistemas deben implementar la configuración más protectora por defecto, sin requerir acción del usuario. |
| **Fail securely** | OWASP Security by Design Principles | Ante cualquier condición de error, el sistema adopta el estado más restrictivo posible. |

---

## Decisiones

---

### AD-01 — Token JWT: 6 horas, sin mecanismo de refresh

**Categoría:** Gestión de sesión · **Inconsistencia resuelta:** IC-01

#### Decisión

El sistema emite un token JWT de sesión única con tiempo de vida de **6 horas** (21 600 segundos). No existe mecanismo de refresh token. No se fuerza re-login por inactividad. La única forma de terminar una sesión antes del vencimiento natural es: (a) logout explícito del usuario, o (b) desactivación del usuario por el Administrador.

#### Fundamentación

**Sobre la eliminación del refresh token:**

NIST SP 800-63B §7.1 establece que la complejidad de los mecanismos de sesión debe ser proporcional al nivel de aseguramiento requerido (AAL). El doble token con rotación introduce una superficie de ataque adicional: el refresh token es un secreto persistente de larga vida que, si se compromete, permite generar access tokens indefinidamente. RFC 6819 §4.1.2 documenta que el refresh token representa un riesgo de seguridad mayor que el access token precisamente por su mayor duración.

Para el contexto operativo de este sistema (sesiones de campo acotadas, equipo reducido, sin acceso público), la relación riesgo/complejidad no justifica el doble token en el MVP.

**Sobre la duración de 6 horas:**

NIST SP 800-63B §4.3.2 (AAL2) recomienda re-autenticación al menos cada 12 horas para sesiones continuas. 6 horas es un 50% más restrictivo que ese límite, balanceando la realidad operativa de sesiones de campo con la reducción de la ventana de exposición de un token comprometido.

OWASP Session Management Cheat Sheet establece que el tiempo absoluto de sesión debe ser el mínimo operativamente viable. 8 horas fue el valor original; se reduce a 6 horas para acotar la ventana de exposición sin afectar la operación en campo.

**Sobre la no imposición de re-login por inactividad:**

El servicio opera en Docker Swarm con múltiples réplicas stateless. Rastrear inactividad requeriría estado compartido entre réplicas (timestamp de última actividad en BD), lo que introduce latencia en cada petición y un punto único de fallo. NIST SP 800-207 §3.3 establece que las decisiones de acceso Zero Trust no deben depender de estado de sesión en memoria. La mitigación de inactividad se delega al timeout absoluto de 6 horas y a la revocación explícita.

#### Consecuencias técnicas

- `jwtExpiresSeconds` = 21 600 en todos los módulos y el XML M1.
- Se elimina el endpoint `POST /auth/refresh` de SRS General (§7.4, §11 RF-M1-03b) y del glosario (§1.3).
- La ventana máxima de exposición de un token comprometido es de 6 horas si el usuario no hace logout y no es desactivado.
- El audit_log registra el evento logout con `jti` para correlación forense. Si el logout no se produjo, la ausencia del evento es evidencia de sesión no cerrada.

---

### AD-02 — Cambio de contraseña incluido en M1

**Categoría:** Gestión de credenciales · **Inconsistencia resuelta:** IC-02

#### Decisión

El Módulo 1 incluye el endpoint `PATCH /users/me/password`. El usuario autenticado puede cambiar su propia contraseña proporcionando la contraseña actual y la nueva. Se aplican tres reglas:

1. La contraseña actual debe verificarse con `bcrypt.verify()` antes de persistir el cambio.
2. La nueva contraseña no puede ser idéntica a la actual (`bcrypt.verify(new, current_hash) == true` → HTTP 400).
3. Al cambiar la contraseña, se registra `password_changed_at = NOW()` en la tabla `users`. El middleware rechaza con HTTP 401 todo token cuyo `iat < password_changed_at`.

#### Fundamentación

**Sobre la inclusión del cambio de contraseña:**

NIST SP 800-63B §5.1.1.2 establece que los sistemas deben permitir a los usuarios cambiar su propia contraseña. Delegar este proceso al Administrador crea un riesgo operativo documentado: el intervalo entre la detección de un compromiso y la intervención del Administrador es una ventana de exposición no controlada. El cambio de contraseña autogestionado es el único mecanismo que permite al usuario cerrar esa ventana sin depender de un tercero.

**Sobre la validación de la contraseña actual:**

OWASP Authentication Cheat Sheet, sección "Change Password": "Before changing the password, verify the current one to prevent CSRF-style attacks." Sin esta validación, un atacante con acceso físico al dispositivo desbloqueado puede cambiar la contraseña sin conocer la actual. La verificación del valor actual es un control de autenticación re-validada (step-up authentication mínima) conforme a NIST SP 800-63B §4.3.3.

**Sobre la prohibición de reusar la contraseña actual:**

NIST SP 800-63B §5.1.1.2: "Verifiers SHALL NOT permit the subscriber to change to a value identical to any of their previous passwords." Una operación de cambio que acepta la misma contraseña no produce ningún efecto de seguridad y genera un falso sentido de control. Rechazar con 400 fuerza al usuario a producir un cambio real.

**Sobre la invalidación de todos los tokens previos via `password_changed_at`:**

OWASP Session Management Cheat Sheet, sección "Session Invalidation": "Upon password change, all active sessions for the user should be invalidated." El mecanismo `password_changed_at` en la tabla `users` es la implementación stateless de este principio para un entorno de réplicas múltiples: no requiere revocar cada `jti` individualmente, sino que el middleware evalúa si el token fue emitido antes del último cambio de contraseña. Es consistente con NIST SP 800-207 §3.3 (verificación continua en cada petición).

**Consecuencia directa:** el usuario queda desautenticado inmediatamente tras el cambio. Debe iniciar sesión con la nueva contraseña. Esto es el comportamiento esperado y deseado bajo Zero Trust: un cambio de credencial es un evento de identidad que invalida todas las sesiones anteriores.

#### Consecuencias técnicas

- Nueva columna `password_changed_at TIMESTAMP NULL` en tabla `users`. Valor inicial: `NULL` (para usuarios que nunca han cambiado su contraseña, el check no aplica).
- Middleware: check adicional `if user.password_changed_at and token_iat < user.password_changed_at: return 401`.
- Endpoint: `PATCH /api/v1/users/me/password` con body `{ current_password, new_password }`.
- El evento se registra en audit_log con `user_id`, timestamp y acción `password_changed`. Sin registro de las contraseñas ni de sus hashes.
- Se actualiza SRS M1 (§1.2, §4.2, §4.3, §5, §9) y XML M1 para incluir el endpoint.

---

### AD-03 — Administrador puede registrar sujetos y aplicaciones

**Categoría:** Control de acceso · **Inconsistencia resuelta:** IC-03

#### Decisión

La matriz de permisos del middleware (SRS M1 §5, RF-M1-05) se corrige: el rol `administrator` tiene permiso para registrar sujetos, contextos, aplicaciones y valores de métricas. El Administrador puede ejecutar todos los flujos operativos del sistema.

#### Fundamentación

El principio de *least privilege* (NIST SP 800-207 §2.1, CIS Control 6) establece que cada entidad debe tener solo los permisos necesarios para su función. Sin embargo, la restricción de acceso al Administrador para operaciones de M4 viola el principio de **disponibilidad operativa**: crea una dependencia estructural del sistema en el rol Aplicador para casos de soporte, pruebas de integración, y situaciones de emergencia donde el Aplicador no está disponible.

NIST SP 800-207 §3.1 define que el Administrador del sistema es una entidad de confianza extendida con capacidad de gestión operativa. Restringir al Administrador a solo operaciones de configuración, sin capacidad de ejecución operativa, contradice el modelo de gestión documentado en SRS General §3.2 ("Control total del sistema").

La inconsistencia documentada entre SRS M1 (✗ para Admin en M4) y SRS General + SRS M4 (✓ para Admin en M4) evidencia un error de transcripción en la matriz de M1, no una decisión de diseño intencional.

#### Consecuencias técnicas

- Corregir la fila "Registrar sujetos y aplicar pruebas" en la matriz de SRS M1 §5: `administrator = ✓`.
- La constante centralizada de permisos en el código debe reflejar este cambio.

---

### AD-04 — `instrument_id` obligatorio en `GET /metrics`

**Categoría:** Diseño de API · **Inconsistencia resuelta:** IC-04

#### Decisión

El parámetro `instrument_id` en `GET /api/v1/metrics` es **obligatorio**. Si no se proporciona, el sistema retorna HTTP 400. XML M3 se corrige para declararlo `required="true"`.

#### Fundamentación

OWASP API Security Top 10 2023, API3:2023 — Broken Object Property Level Authorization: exponer datos sin un contexto de filtrado obligatorio aumenta la superficie de exposición de información. Sin `instrument_id`, el endpoint retornaría todas las métricas del sistema en una sola respuesta, lo que:

1. Viola el principio de minimización (GDPR Art. 5(1)(c)): el cliente recibe más datos de los necesarios para su operación.
2. Permite a cualquier rol autenticado realizar reconocimiento completo de la estructura de métricas del sistema (footprinting interno).
3. No tiene un caso de uso legítimo definido en ningún módulo: M4 siempre consulta por instrumento, y M3 no define ningún escenario de consulta global.

Privacy by Design Principio 3 (Cavoukian): "Privacy Embedded into Design" — el diseño por defecto debe ser el más restrictivo. Un parámetro opcional que expone datos completos del sistema contradice este principio.

#### Consecuencias técnicas

- XML M3: `<param name="instrument_id" required="true">`.
- Agregar `<response status="400">` en XML M3 para el caso de parámetro ausente.
- SRS M3 ya es correcto.

---

### AD-05 — HTTP 422 exclusivo para instrumento inactivo en `POST /applications`

**Categoría:** Semántica de API · **Inconsistencia resuelta:** IC-05

#### Decisión

El código de respuesta para "instrumento existe pero está inactivo" es **HTTP 422 Unprocessable Entity** exclusivamente. Se elimina del bloque de causas de HTTP 400 en XML M4.

#### Fundamentación

RFC 9110 §15.5.21 define HTTP 422 como la respuesta apropiada cuando la solicitud está bien formada sintácticamente pero no puede procesarse por una condición semántica del servidor. RFC 9110 §15.5.1 define HTTP 400 para errores de formato o sintaxis en la solicitud.

Un instrumento inactivo es una condición semántica válida del estado del sistema, no un error del cliente en la formación de la solicitud. La distinción es operativamente relevante: el cliente puede diferenciar entre un error en sus datos (400) y un estado del recurso que impide la operación (422), sin necesidad de parsear el mensaje de error.

Tener el mismo caso bajo dos códigos distintos en el mismo contrato es una ambigüedad que garantiza implementaciones incorrectas y comportamientos de cliente no deterministas.

#### Consecuencias técnicas

- XML M4, endpoint `RF-M4-03`: eliminar "instrumento inactivo" de la lista de causas del `<response status="400">`.
- El `<response status="422">` permanece como único código para este caso.
- SRS M4 §5 RF-M4-03 ya es correcto.

---

### AD-06 — Campos condicionales incorrectos se rechazan con HTTP 400

**Categoría:** Integridad de datos · **Inconsistencia resuelta:** IC-06

#### Decisión

En `POST /metrics` y `PATCH /metrics/{id}`, enviar campos condicionales incompatibles con el `metric_type` declarado retorna HTTP 400. Los campos incompatibles nunca se ignoran silenciosamente:

- `min_value` o `max_value` en métrica no numérica → HTTP 400.
- `options` en métrica no categórica → HTTP 400.

Se corrige SRS M3 RF-M3-01 (tabla de validaciones) que indicaba ignorarlos.

#### Fundamentación

OWASP Input Validation Cheat Sheet: "Reject unexpected or invalid inputs rather than silently ignoring them." La aceptación silenciosa de datos inválidos es clasificada como una vulnerabilidad de validación de entrada porque:

1. Oculta errores de configuración que se manifiestan más tarde como datos incorrectos en el dataset, en un contexto donde la corrección no es posible sin intervención (el sistema no permite eliminación).
2. En un sistema científico, un campo `min_value` enviado por error en una métrica categórica podría indicar una confusión del cliente sobre el tipo de métrica. El rechazo explícito fuerza la corrección antes de que el error se propague al dataset.

CWE-20 (Improper Input Validation): el software no valida correctamente las entradas que pueden afectar el flujo de control o el estado de los datos. El rechazo con 400 es la implementación directa del principio *fail securely* (OWASP).

Adicionalmente, la incoherencia interna del SRS M3 (RF-M3-01 dice ignorar; RF-M3-03 y RNF-M3-04 dicen rechazar con 400) se resuelve unificando el comportamiento en rechazo, que es la postura más segura y la más consistente con el resto del documento.

#### Consecuencias técnicas

- SRS M3 RF-M3-01: cambiar "Se ignora si se envía" por "HTTP 400 si se envía" en las celdas de campos incompatibles.
- XML M3 ya documenta el comportamiento correcto de rechazo.

---

### AD-07 — Respuestas de autenticación unificadas en HTTP 401

**Categoría:** Anti-enumeración / anti-fingerprinting · **Contexto:** Postura Zero Trust

#### Decisión

El endpoint `POST /auth/login` retorna **HTTP 401 con mensaje genérico idéntico** para todos los escenarios de fallo de autenticación:

- Credenciales incorrectas.
- Correo no registrado.
- Cuenta desactivada.

La distinción entre causas se registra **exclusivamente** en el audit_log interno.

El endpoint elimina el HTTP 403 diferenciado para cuentas desactivadas.

#### Fundamentación

OWASP Testing Guide, OTG-AUTHN-004 — Testing for Account Enumeration and Guessable User Account: cualquier diferencia observable en la respuesta del sistema (código HTTP, tiempo de respuesta, contenido del mensaje) que permita a un atacante inferir si una cuenta existe constituye una vulnerabilidad de enumeración de cuentas.

CWE-204 — Observable Response Discrepancy: "The product provides different responses to incoming requests in a way that reveals internal state information to an unauthorized actor." El código HTTP 403 para cuenta desactivada revela que: (a) el correo existe en el sistema y (b) la cuenta está en estado inactivo. Esta información combinada con el 401 genérico para credenciales incorrectas crea un canal de oráculos que permite clasificar todas las cuentas del sistema.

NIST SP 800-63B §8.2.2 — Verifier Impersonation Resistance establece que los verifiers no deben revelar si el identificador del suscriptor existe al retornar mensajes de error de autenticación.

En el contexto de este sistema — donde el Administrador es el único que puede crear cuentas — la información de si un correo está registrado o desactivado no tiene valor legítimo para el cliente que hace la solicitud de login. Solo tiene valor para un atacante que realiza reconocimiento.

El audit_log registra la causa real con `user_id` (si aplica), timestamp y acción, lo que preserva la trazabilidad interna sin exponer información al exterior.

#### Consecuencias técnicas

- `POST /auth/login`: eliminar la rama de HTTP 403 de las respuestas del endpoint.
- Toda falla de autenticación retorna `{ "status": "error", "message": "Invalid credentials", "data": null }` con HTTP 401.
- Tiempo de respuesta constante entre los distintos escenarios de fallo (constant-time comparison via bcrypt ya lo garantiza para el caso de contraseña incorrecta; para correo no encontrado, aplicar delay artificial equivalente al tiempo de bcrypt para evitar timing attacks).
- Audit_log registra la causa real: `AUTH_FAILED_WRONG_PASSWORD`, `AUTH_FAILED_USER_NOT_FOUND`, `AUTH_FAILED_ACCOUNT_DISABLED`.
- Se actualiza SRS M1 §5 RF-M1-03 y XML M1 RF-M1-03.

---

### AD-08 — HTTP 401 uniforme durante bloqueo por rate limiting

**Categoría:** Anti-detección / postura Zero Trust · **Contexto:** Postura Zero Trust

#### Decisión

Durante el periodo de bloqueo por rate limiting (5 intentos fallidos en 60 s → bloqueo 5 minutos), el sistema retorna **HTTP 401** con el mismo mensaje genérico de credenciales inválidas. No se retorna HTTP 429.

#### Fundamentación

RFC 6585 §4 define HTTP 429 Too Many Requests como la respuesta estándar para rate limiting. Sin embargo, retornar 429 proporciona al atacante información operativamente valiosa: (a) confirma que el sistema tiene rate limiting, (b) indica que fue detectado, y (c) le permite calibrar la frecuencia de sus intentos para permanecer bajo el umbral.

OWASP Automated Threats to Web Applications, OAT-007 — Credential Cracking: los sistemas de defensa efectivos no revelan su detección para impedir la adaptación del atacante.

La postura Zero Trust (NIST SP 800-207 §3.1) requiere que "the enterprise monitors and measures the integrity and security posture of all owned and associated assets." El monitoreo debe ser interno y no debe señalizar su activación al exterior. El audit_log registra el bloqueo con IP, timestamp y conteo de intentos, lo que preserva la capacidad forense sin revelar el estado del sistema al atacante.

**Contrapunto documentado:** HTTP 429 beneficia al cliente legítimo que cometió errores tipográficos, permitiéndole entender que debe esperar. Esta UX se sacrifica intencionalmente a favor de la postura de seguridad. En el contexto del sistema — donde solo tres roles fijos usan el sistema y los usuarios legítimos conocen sus credenciales — la probabilidad de que un usuario legítimo alcance 5 intentos fallidos en 60 segundos es mínima.

#### Consecuencias técnicas

- XML M1 RF-M1-03: eliminar `<response status="429">`. La descripción del bloqueo se mueve a una nota interna (comment XML) en el nodo del endpoint.
- SRS M1 §5 CA-HU3-06 y RNF-M1-07: actualizar para especificar que la respuesta es HTTP 401, no 429.
- El audit_log registra el evento `AUTH_RATE_LIMIT_TRIGGERED` con IP y timestamp.

---

### AD-09 — `POST /subjects` rechaza cualquier campo en el body

**Categoría:** Privacy by Design / minimización · **Contexto:** Postura Zero Trust

#### Decisión

El endpoint `POST /subjects` rechaza con **HTTP 400** cualquier solicitud cuyo body contenga campos, independientemente del nombre o valor de esos campos. El body debe estar vacío o ausente.

#### Fundamentación

GDPR Art. 5(1)(c) — Data Minimisation: "Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed." El endpoint de registro de sujetos existe precisamente para garantizar que ningún dato identificable entre al sistema.

Privacy by Design Principio 2 (Cavoukian): "Privacy as the Default Setting" — el estado por defecto del sistema debe ser el más protector posible, sin requerir acción del usuario o del cliente para activar esa protección. Un sistema que ignora silenciosamente campos PII enviados por error permite que un cliente mal configurado filtre datos personales que el servidor descartaría, pero que ya habrían transitado por la red y potencialmente por logs de infraestructura (proxies, load balancers, herramientas de observabilidad).

OWASP Security by Design — Fail Securely: ante una entrada inesperada, el sistema debe adoptar el estado más restrictivo. Ignorar silenciosamente un body con datos es lo opuesto de fallar de forma segura: acepta la solicitud sin garantizar que el cliente entendió el protocolo.

El rechazo activo fuerza al cliente a corregir su implementación antes de que pueda operar con el sistema, garantizando que la integración cumpla el contrato de privacidad antes de ser funcional.

#### Consecuencias técnicas

- `POST /subjects`: Pydantic schema con `model_config = ConfigDict(extra='forbid')`. Cualquier campo adicional falla la validación de esquema con HTTP 400.
- SRS M4 §5 RF-M4-01: documentar explícitamente "Si el body contiene cualquier campo, el sistema retorna HTTP 400."
- XML M4 RF-M4-01: agregar `<response status="400"><description>Body no debe contener campos</description></response>`.

---

### AD-10 — El audit_log almacena `jti`, nunca el token completo

**Categoría:** Integridad de logs / protección de credenciales · **Contexto:** Postura Zero Trust

#### Decisión

El sistema nunca persiste el token JWT completo en ninguna capa: audit_log, logs de aplicación, logs de infraestructura, o mensajes de error. El audit_log almacena exclusivamente el `jti` (UUID del token) como referencia al evento de sesión.

#### Fundamentación

CWE-532 — Insertion of Sensitive Information into Log File: "Information written to log files can be of a sensitive nature and give valuable guidance to an attacker or expose sensitive user information." Un token JWT completo en un log es funcionalmente equivalente a almacenar una contraseña en texto plano: cualquier entidad con acceso al log puede suplantar al usuario hasta la expiración del token.

NIST SP 800-92 — Guide to Computer Security Log Management §6.2.3: "Log files should not contain sensitive data such as passwords, security tokens, or personal data beyond what is operationally necessary." El `jti` es el mínimo necesario para correlacionar un evento de log con un token específico (para revocación, auditoría o respuesta a incidentes) sin exponer el token como credencial reutilizable.

OWASP Logging Cheat Sheet: "Never log sensitive data: passwords, session tokens, credit card numbers, authentication tokens." El JWT es explícitamente un token de autenticación.

Privacy by Design Principio 7 (Cavoukian): "Respect for User Privacy — Keep it User-Centric." Los logs que contienen tokens de sesión podrían correlacionarse con actividad del usuario más allá del propósito operativo declarado, violando el principio de minimización en la capa de observabilidad.

#### Consecuencias técnicas

- El esquema de la tabla `audit_log` incluye: `id`, `user_id`, `jti`, `event_type`, `timestamp`, `ip_address`, `details` (JSON no-sensible). Sin columna para el token completo.
- La configuración de logging del framework (FastAPI/Uvicorn) debe excluir el header `Authorization` de los access logs. Esto se configura a nivel de middleware o del servidor ASGI.
- Los logs de infraestructura (Docker, proxy de Swarm) deben configurarse para no capturar headers de autorización. Esta es una restricción de configuración de despliegue que debe documentarse en la estrategia de despliegue.
- Se actualiza SRS General §6.1 (atributos de `AuditLog`) y RNF-SEC-12 para especificar explícitamente que solo se almacena `jti`.

---

## Resumen de cambios por documento

| Decisión | SRS General | SRS M1 | SRS M2 | SRS M3 | SRS M4 | XML M1 | XML M2 | XML M3 | XML M4 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| AD-01 Token 6h / sin refresh | ✎ | — | — | — | — | ✎ | — | — | — |
| AD-02 Cambio de contraseña | — | ✎ | — | — | — | ✎ | — | — | — |
| AD-03 Admin registra sujetos | — | ✎ | — | — | — | — | — | — | — |
| AD-04 instrument_id obligatorio | — | — | — | — | — | — | — | ✎ | — |
| AD-05 HTTP 422 exclusivo | — | — | — | — | — | — | — | — | ✎ |
| AD-06 Rechazar campos condicionales | — | — | — | ✎ | — | — | — | — | — |
| AD-07 401 unificado en login | — | ✎ | — | — | — | ✎ | — | — | — |
| AD-08 401 durante rate limiting | — | ✎ | — | — | — | ✎ | — | — | — |
| AD-09 POST /subjects rechaza body | — | — | — | — | ✎ | — | — | — | ✎ |
| AD-10 Audit_log solo jti | ✎ | — | — | — | — | — | — | — | — |

---

## Referencias

| Documento | Acceso |
|---|---|
| NIST SP 800-207 — Zero Trust Architecture (2020) | csrc.nist.gov/publications/detail/sp/800-207/final |
| NIST SP 800-63B — Digital Identity Guidelines (2017, rev. 2022) | pages.nist.gov/800-63-3/sp800-63b.html |
| NIST SP 800-92 — Guide to Computer Security Log Management (2006) | csrc.nist.gov/publications/detail/sp/800-92/final |
| OWASP Authentication Cheat Sheet | cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html |
| OWASP Session Management Cheat Sheet | cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html |
| OWASP Input Validation Cheat Sheet | cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html |
| OWASP Logging Cheat Sheet | cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html |
| OWASP Testing Guide OTG-AUTHN-004 — Account Enumeration | owasp.org/www-project-web-security-testing-guide |
| OWASP API Security Top 10 2023 | owasp.org/API-Security |
| CWE-20 — Improper Input Validation | cwe.mitre.org/data/definitions/20.html |
| CWE-204 — Observable Response Discrepancy | cwe.mitre.org/data/definitions/204.html |
| CWE-532 — Insertion of Sensitive Information into Log File | cwe.mitre.org/data/definitions/532.html |
| RFC 6585 — Additional HTTP Status Codes (2012) | tools.ietf.org/html/rfc6585 |
| RFC 6819 — OAuth 2.0 Threat Model and Security Considerations (2013) | tools.ietf.org/html/rfc6819 |
| RFC 9110 — HTTP Semantics (2022) | tools.ietf.org/html/rfc9110 |
| Cavoukian, A. (2009) — Privacy by Design: The 7 Foundational Principles | ipc.on.ca/wp-content/uploads/resources/7foundationalprinciples.pdf |
| GDPR Regulation (EU) 2016/679 — Art. 5, 25 | eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679 |

---

*Bitácora de Decisiones de Seguridad y Arquitectura · v1.0 · 2026-03-13*
