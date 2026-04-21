# Aviso de Privacidad y Protección de Datos Personales

**Sistema de Registro Metodológico de Métricas Lingüísticas**  
**Versión:** 1.0 · **Fecha de emisión:** 2026-04-17 · **Estado:** Vigente

---

## Marco Normativo

El presente Aviso de Privacidad se emite en cumplimiento de:

- **Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)**, publicada en el Diario Oficial de la Federación el 5 de julio de 2010.
- **Reglamento de la LFPDPPP**, publicado el 21 de diciembre de 2011.
- **Lineamientos del Aviso de Privacidad**, publicados el 17 de enero de 2013.
- **Recomendaciones en materia de seguridad de datos personales** del Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI).

---

## 1. Identidad y Domicilio del Responsable

El **responsable del tratamiento** de los datos personales recabados a través del Sistema de Registro Metodológico de Métricas Lingüísticas (en adelante "el Sistema") es el **equipo académico responsable del proyecto**, con domicilio para notificaciones en la dirección institucional comunicada a través de los canales oficiales del proyecto.

Para ejercer cualquier derecho previsto en la LFPDPPP, el titular podrá dirigirse al responsable mediante los canales de contacto publicados en el repositorio oficial del proyecto.

---

## 2. Datos Personales Recabados

El Sistema distingue dos categorías de personas cuyos datos son tratados:

### 2.1 Usuarios Operativos del Sistema

Los **aplicadores**, **investigadores** y el **superadministrador** son personas que acceden directamente al Sistema para realizar funciones operativas. Los datos recabados de este grupo son:

| Dato | Finalidad | Obligatorio |
|------|-----------|-------------|
| Correo electrónico institucional | Identificación, autenticación y envío de Magic Link de activación | Sí |
| Contraseña (almacenada como hash irreversible) | Autenticación segura | Sí |
| Rol asignado (`superadmin`, `applicator`, `researcher`) | Control de acceso basado en roles (RBAC) | Sí |
| Registro de sesiones activas (JTI, fecha/hora) | Seguridad operativa y auditoría | Sí |
| Registro de auditoría (tipo de evento, fecha/hora, ID de usuario) | Trazabilidad de acciones de seguridad | Sí |
| Estado de cuenta (`activo` / `inactivo`) | Control de acceso y continuidad del servicio | Sí |

> **Nota:** No se almacenan datos sensibles en los términos del Artículo 3°, fracción VI de la LFPDPPP para los usuarios operativos.

### 2.2 Sujetos de Estudio (Personas Evaluadas)

Los **sujetos de estudio** son las personas sobre quienes se aplican los instrumentos metodológicos lingüísticos. El Sistema aplica **Privacidad desde el Diseño** (*Privacy by Design*): los sujetos **no son identificables** en ningún punto del flujo de datos.

| Dato | Descripción | Carácter |
|------|-------------|----------|
| Identificador UUID | Generado automáticamente. No derivable de datos personales. | Seudónimo no vinculado a PII |
| Tipo de escuela | Categoría general (pública/privada/concertada). Máx. 3 valores. | Contextual no identificable |
| Nivel educativo | Categorías predefinidas. Máx. 5 valores. | Contextual no identificable |
| Cohorte de edad | Formato de **rango** (e.g., "6-8"), nunca edad exacta. | Cuasi-identificable con restricción |
| Género | Categorías predefinidas. Máx. 4 valores. | Contextual no identificable |
| Nivel socioeconómico | Categorías predefinidas. Máx. 4 valores. | Contextual no identificable |
| Atributos adicionales (opcional) | Máx. 5 claves; longitud máx. 200 chars. Prohibido: nombre, apellido, CURP, RFC, email, teléfono, dirección, SSN. | Contextual con restricciones estrictas |
| Valores de métricas lingüísticas | Resultados cuantitativos/cualitativos de instrumentos aplicados. | Datos metodológicos no identificables |

> La combinación de atributos contextuales podría constituir un **dato cuasi-identificable** conforme al Artículo 3° LFPDPPP. El Sistema aplica restricciones técnicas para reducir este riesgo (rangos de edad, listas controladas, restricciones de longitud y campos prohibidos).

---

## 3. Finalidades del Tratamiento

### 3.1 Finalidades Primarias (necesarias para la prestación del servicio)

1. **Autenticación y control de acceso:** verificar la identidad de los usuarios operativos y garantizar que cada rol acceda exclusivamente a las funciones que le corresponden.
2. **Registro operativo de aplicaciones de instrumentos:** capturar, almacenar y mantener íntegros los datos metodológicos de las sesiones de evaluación lingüística.
3. **Generación del dataset de investigación:** consolidar los registros anonimizados para su consulta y exportación por parte del equipo investigador.
4. **Seguridad del sistema:** mantener registros de sesiones y auditoría para proteger la integridad de los datos y detectar accesos no autorizados.

### 3.2 Finalidades Secundarias

El Sistema **no utiliza los datos recabados** para finalidades distintas a las descritas en §3.1; en particular:

- No se realiza mercadotecnia, publicidad ni prospección comercial.
- No se ceden ni transfieren datos a terceros con fines distintos al proyecto académico.
- No se realiza perfilado de usuarios operativos.

---

## 4. Mecanismos de Recabación de Datos

### 4.1 Registro de Usuarios Operativos

El superadministrador registra a cada aplicador/investigador mediante el formulario del sistema (`POST /users`). Se genera y envía un **Magic Link de un solo uso** al correo institucional del usuario, quien completa su registro estableciendo su contraseña (`GET /auth/activate/:token`). El Magic Link expira en 24 horas.

### 4.2 Autenticación

Los usuarios proveen correo y contraseña a través del formulario seguro del sistema (`POST /auth/login`). La sesión se materializa en un **JWT firmado con HMAC-SHA256**, con vigencia de 6 horas. El token contiene exclusivamente el identificador de usuario, el rol y los metadatos de la sesión; **no contiene datos personales en texto claro**.

Los investigadores y aplicadores pueden autenticarse adicionalmente mediante **OIDC (OpenID Connect)** delegado al proveedor de identidad institucional (Keycloak), sin que el Sistema almacene contraseñas adicionales.

### 4.3 Registro de Sujetos de Estudio

El aplicador inicia el registro mediante el wizard operativo (`POST /projects/:projectId/subjects`). El Sistema genera automáticamente un UUID sin solicitar ningún dato personal. Los datos contextuales se registran exclusivamente mediante los campos controlados descritos en §2.2.

### 4.4 Captura de Valores de Métricas

El aplicador completa el formulario dinámico generado a partir de los instrumentos configurados (`POST /metric-values`). La operación es **atómica**: si alguna validación falla, ningún dato parcial se persiste.

### 4.5 Registro de Sesiones y Auditoría

El sistema registra automáticamente los eventos de inicio/cierre de sesión y cambios críticos de configuración. Estos registros son accesibles únicamente por el superadministrador y se conservan exclusivamente para auditoría de seguridad.

---

## 5. Transferencia de Datos

Los datos personales **no serán transferidos** a terceros ajenos al proyecto, salvo en los supuestos del Artículo 37 de la LFPDPPP (cumplimiento de obligaciones legales, resoluciones de autoridades competentes u otras excepciones legales).

El dataset de investigación generado es, por diseño, anónimo e irreversiblemente desvinculado de datos personales, por lo que su uso, publicación o transferencia a la comunidad científica no constituye tratamiento de datos personales en términos de la LFPDPPP.

---

## 6. Derechos ARCO

En términos del Capítulo IV de la LFPDPPP, los titulares tienen derecho a:

- **Acceso:** conocer qué datos personales se tienen registrados y cómo se tratan.
- **Rectificación:** solicitar la corrección de datos inexactos o incompletos.
- **Cancelación:** solicitar la supresión de sus datos cuando ya no sean necesarios para las finalidades del tratamiento.
- **Oposición:** oponerse al tratamiento de sus datos para finalidades específicas.

### 6.1 Procedimiento para el Ejercicio de Derechos ARCO

El titular deberá presentar solicitud escrita a través de los canales de contacto del responsable, incluyendo:

1. Nombre completo y correo electrónico institucional registrado en el sistema.
2. Descripción clara del derecho que desea ejercer.
3. Documentación que acredite su identidad.
4. En caso de rectificación, señalar los datos a corregir y la corrección solicitada.

El responsable tendrá **20 días hábiles** para atender la solicitud, conforme al Artículo 32 de la LFPDPPP, con posibilidad de prórroga por igual periodo cuando lo justifique la complejidad o el número de solicitudes.

---

## 7. Revocación del Consentimiento

El titular podrá revocar en cualquier momento el consentimiento otorgado, mediante solicitud dirigida al responsable. La revocación tendrá como consecuencia la baja del usuario en el sistema y la cesación del tratamiento de sus datos para las finalidades primarias, salvo datos que deban conservarse por obligación legal o para la defensa de derechos del responsable.

> **Nota:** La revocación del consentimiento no afecta los registros operativos anonimizados de los sujetos de estudio, ya que dichos datos no están vinculados a la identidad de ningún usuario.

---

## 8. Medidas de Seguridad

El responsable ha implementado las medidas de seguridad previstas en el Artículo 19 de la LFPDPPP:

| Medida | Descripción |
|--------|-------------|
| Hashing de contraseñas | Las contraseñas se almacenan exclusivamente como hash irreversible; nunca en texto plano. |
| Tokens JWT firmados | Las sesiones se gestionan mediante tokens firmados con HMAC-SHA256; la clave de firma se gestiona como Kubernetes Secret. |
| Revocación de tokens | Los tokens pueden revocarse individualmente ante cierre de sesión o desactivación de usuario. |
| Control de acceso por roles (RBAC) | Cada endpoint verifica el rol del solicitante antes de ejecutar cualquier operación. |
| Magic Link de un solo uso | El enlace de activación expira en 24 horas y se invalida tras su primer uso. |
| Minimización de datos | Los sujetos de estudio se identifican exclusivamente por UUID. |
| Restricciones sobre cuasi-identificables | El sistema valida técnicamente rangos, listas de valores y campos prohibidos. |
| Separación de entornos | Las credenciales de despliegue se inyectan como Kubernetes Secrets; nunca se almacenan en archivos versionados. |
| Registro de auditoría | Se conserva un `audit_log` de eventos de seguridad con marca de tiempo. |
| Rate limiting | Se bloquean temporalmente las cuentas tras 5 intentos de autenticación fallidos en 60 segundos. |

---

## 9. Uso de Cookies y Tecnologías de Rastreo

El Sistema es una aplicación web institucional de acceso restringido. **No utiliza cookies de rastreo, publicidad o analítica de terceros.** El almacenamiento local del navegador puede usarse exclusivamente para mantener el token de sesión activo durante la navegación; dicho token se elimina al cerrar sesión.

---

## 10. Cambios al Aviso de Privacidad

El responsable se reserva el derecho de actualizar el presente Aviso de Privacidad en cualquier momento para reflejar cambios legislativos, operativos o en las finalidades del tratamiento. Cualquier modificación será notificada a los usuarios operativos activos a través del correo electrónico registrado y publicada en el repositorio oficial del proyecto con al menos **15 días de anticipación** a su entrada en vigor.

---

## 11. Autoridad de Protección de Datos

Si el titular considera que sus derechos han sido vulnerados, podrá interponer queja ante el **Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)**:

- Sitio web: [https://www.inai.org.mx](https://www.inai.org.mx)
- Teléfono: 800-835-4324

---

*Última actualización: 2026-04-17*