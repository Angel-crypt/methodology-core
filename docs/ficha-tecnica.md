# Ficha Oficial de Alcance y Defensa Estratégica

**Proyecto:** Sistema de Captura y Trazabilidad de Datos Académicos (SCTDA)  
**Versión:** 1.0 (ejecutiva)  
**Propósito del documento:** Alinear visión, alcance funcional, estado real de implementación y estrategia de fases bajo restricciones reales.

---

## 0) Contexto y naturaleza del sistema

**Sistema académico–tecnológico de apoyo a la investigación que permite el registro estructurado, estandarizado y trazable de métricas lingüísticas obtenidas mediante instrumentos aplicados por profesionales conforme a marcos metodológicos definidos, bajo principios de anonimización, minimización y separación de identidad, con el propósito de construir una base de datos consistente y preparada para análisis científico posterior, sin realizar clasificación automática, interpretación asistida ni análisis poblacional en esta fase.**

En síntesis: el sistema no analiza. Su propósito es construir una infraestructura metodológica digital estandarizada que garantice captura consistente, trazable y preparada para análisis científico futuro.

---

## 0.1) Tesis ejecutiva

**El Sistema de Captura y Trazabilidad de Datos Académicos (SCTDA) no es un motor de IA diagnóstica en esta fase.**  
Es una **infraestructura metodológica digital** para captura estandarizada, trazable y anonimizada de métricas lingüísticas, diseñada para habilitar investigación científica posterior con datos consistentes y gobernados.

**Tesis de valor:**  
Sin datos estructurados, comparables y auditables, no hay base científica para IA confiable. Por eso, la fase actual prioriza **calidad de datos, trazabilidad y gobernanza** antes que automatización analítica.

---

## 1) Contexto: Crisis Lingüística Post-Pandemia en México

### 1.1 Datos Cuantificables (evidencia del problema)

| Fenómeno | Dato | Fuente |
|---------|------|--------|
| Retraso en vocabulario | 3–4 meses en cohortes 2019–2022 | Hsu et al., 2023 |
| Dificultades pragmáticas sociales | 45% con dificultades persistentes post-confinamiento | Gallup, 2025 |
| Impacto en argumentación compleja | Afectación significativa en educación primaria–secundaria | Zúñiga-Montañez et al., 2024 |
| Brecha de comprensión lectora | 79% estudiantes latinoamericanos bajo mínimo | TEC de Monterrey, 2023 |

### 1.2 Diagnóstico Nacional

**El problema no es genérico — es específicamente mexicano:**

- 92% de estudios disponibles originan en Europa/EEUU (**sesgo geográfico severo**).
- **Cero datasets de conversaciones infantiles mexicanas validados clínicamente.**
- Sin plataformas IA-diagnóstica escalables adaptadas al contexto mexicano.

### 1.3 Oportunidad Institucional

**Global University tiene la oportunidad de ser la primera institución en México** en:
1. Desarrollar una plataforma diagnóstica IA-psicología validada clínicamente.
2. Generar el **primer dataset nacional abierto** de conversaciones infantiles mexicanas.
3. Definir **protocolos para adopción SEP/IMSS**.

### 1.4 El Rol del MVP en Esta Estrategia

| Proyecto completo (visón) | Este MVP (infraestructura) |
|--------------------------|-------------------------|
| Plataforma de IA transparente para déficit lingüístico post-pandemia | **Infraestructura de captura estandarizada y trazable** |
| Dataset mexicano abierto + protocolos SEP/IMSS | La **base de datos** que hace posible ese dataset |
| Plataforma IA-diagnóstica validada clínicamente | **No es parte del MVP** — es visión de fase 2+ |

> **Sin dataset robusto y trazable no existe IA diagnóstica defendible.**
> Primero se construye la infraestructura de captura y gobernanza; después, la capa analítica.

### 1.5 Decisión estratégica (no reactiva)
El cambio de enfoque **no es downgrade**: es una secuencia lógica basada en evidencia.

**Resultado esperado del MVP:** Entregar una plataforma operativa que produzca datos útiles para ciencia aplicada futura, reduciendo riesgo metodológico, ético y técnico.

---

## 2) Visión a largo plazo (fase 2+)

Desarrollar, sobre datos locales de calidad, un ecosistema de analítica avanzada y eventualmente IA aplicada a evaluación lingüística, con validación clínica y adopción institucional.

> La IA es **visión de evolución**, no promesa de entrega MVP.

---

## 3) Alcance del MVP (fase 1)

### 3.1 In-scope funcional del producto (qué debe existir en el producto objetivo)
1. **Plataforma web (PWA) con acceso autenticado por rol**.
2. **Control de usuarios y roles** (administrador, investigador, aplicador).
3. **Configuración metodológica** (instrumentos + métricas + vigencia + estado).
4. **Registro operativo anonimizado** (UUID, contexto no identificable, captura validada).
5. **Persistencia relacional trazable** (instrumento ↔ aplicación ↔ métrica ↔ aplicador).
6. **Consulta interna básica** (filtros por instrumento/periodo/aplicador).
7. **Exportación controlada** (CSV/JSON estructurado para análisis externo).

### 3.2 Estado de implementación actual (evidencia del sistema hoy)

| Módulo | Estado | Detalle |
|--------|--------|---------|
| M1 Autenticación y acceso | ✅ Operativo | OIDC + SystemLogin + magic link + sesión expirada + SESSION_REVOKED/SESSION_EXPIRED distintos |
| M1 Seguridad de contraseña | ✅ Operativo | Validación real-time: longitud, mayúscula, número, carácter especial + lista de contraseñas inseguras (rechazadas aunque cumplan patrones). Solo superadmin puede cambiar contraseña. |
| M2 Proyectos | ✅ Operativo | CRUD + membresía + instrumentos por proyecto + config operativa |
| M3 Instrumentos/Métricas | ✅ Operativo | CRUD con tags, min_days, estado activo/inactivo |
| M4 Registro Operativo | ✅ Operativo | Wizard multi-paso: proyecto, sujeto, contexto, aplicación, métricas |
| Perfiles y Onboarding | ✅ Operativo | Onboarding dinámico + institución detectada por dominio (subdominios progresivos) |
| Instituciones | ✅ Operativo | CRUD + PATCH + resolución de subdominios + validación email real-time |
| Mis Registros | ✅ Operativo | Filtros: instrumento, fecha desde/hasta, proyecto. Paginación. Expansión de fila con métricas. |
| Mis Usuarios | ✅ Operativo | Filtros: proyecto, fecha desde/hasta, instrumento. Proyecto en cada sujeto. |
| M5 Consulta investigador | ⚠️ Pendiente | Solo historial applicator vía `/applications/my`. Falta `/applications` paginado + stats SUPERADMIN. |
| M6 Exportación | ❌ No implementado | Falta `/export/csv` y `/export/json` con `project_id` obligatorio y audit log. |

**Arquitectura de servicios:** contrato API unificado `{ok, data, meta, error, code}` en `lib/api.js`. Todas las llamadas HTTP pasan por la capa de servicios (`services/`). Locale centralizado en `constants/locale.js`.

**Gestión de usuarios:** componente `GestionUsuarios` unificado para aplicadores e investigadores (parametrizado por `role`). Rutas `/usuarios/aplicadores` y `/usuarios/investigadores` mantienen URLs independientes.

**Cobertura de tests:** 231 tests totales — Frontend: 116 tests (18 archivos), Mock: 115 tests (9 archivos). Cobertura funcional de M1–M4, instituciones, onboarding, perfiles, mis registros, mis usuarios.

**Importante:** el producto funcional objetivo incluye M5/M6; están planificados como siguiente sprint.

---

## 4) Fuera de alcance (explícito y no negociable en MVP)

- Diagnóstico automático.
- Clasificación/predicción por IA.
- Interpretación narrativa asistida (LLM).
- Estadística automatizada/poblacional.
- Dashboards analíticos avanzados.
- Entrenamiento de modelos.
- RAG/TTS/SST.
- Interacción directa niño–plataforma.
- Cumplimiento normativo integral formal certificado en esta fase.

---

## 5) Matriz estratégica de fases (decisión basada en evidencia)

| Elemento | Fase 1 (MVP actual) | Fase 2 (Evolución) |
|---|---|---|
| Objetivo | Captura y gobernanza de datos | Analítica/IA sobre base validada |
| Unidad de valor principal | Registro metodológico trazable y exportable | Insight analítico/diagnóstico asistido (si evidencia lo permite) |
| Dependencia crítica | Operación consistente por aplicadores | Dataset suficiente + validación científica |
| Riesgo dominante | Adopción operativa y cierre M5/M6 | Riesgo clínico/metodológico de modelos |
| Entregable | Infraestructura de datos académicos | Capa de análisis avanzado |

---

## 6) Propuesta de valor actual (sin IA) — vs alternativas gratuitas

Para evitar la percepción de "sistema de carga", se presenta una comparativa técnica concreta con alternativas gratuitas:

| Criterio | Google Forms / Excel | SCTDA (este sistema) |
|---------|---------------------|---------------------|
| Modelo de datos estable | No (，自由 por formulario) | ✅ Estructurado (instrumento → métricas → contexto) |
| Trazabilidad por rol | No (captura genérica) | ✅ Actor, instrumento, timestamp, versión del instrumento |
| Gobernanza de datos | No (compartido por archivo) | ✅ RBAC, auditoría, revocación de sesión |
| Anonimización nativa | No (identidad en datos) | ✅ Código anónimo por proyecto, separación identidad-métricas |
| Control de calidad en captura | No (validación manual) | ✅ Tipos enforceados, rangos configurables, obligatoriedad por instrumento |
| Consistencia metodológica | No (cada aplicador decide) | ✅ Instrumentos configurados, min_days, estado activo/inactivo |
| Historial de cambios | No (se pierde el rastro) | ✅ Auditoría completa de cambios en configuración |

La diferencia **no es tener formularios nicer**. Es que los datos capturados con SCTDA son **comparables, trazables y gobernados** desde el origen. Un Excel con buenas intenciones sigue siendo un dataset sin estructura ni garantías.

**Unidades de valor concretas:**

1. **Estandarización metodológica:** evita variación de captura entre aplicadores y periodos.
2. **Trazabilidad científica:** cada registro conserva contexto de instrumento, aplicación y actor.
3. **Gobernanza de datos:** roles, control de acceso y estructura exportable consistente.
4. **Preparación analítica:** los datos salen listos para análisis externo reproducible (Python/R/SPSS/Excel según equipo).

**Nota:** el valor es operativo aunque no se construya IA. El SCTDA tiene valor propio como infraestructura de registro científico estandarizado.

---

## 7) Ecosistema completo (dónde ocurre el análisis)

El sistema **no analiza** dentro de plataforma en esta fase. El flujo real es:

1. Captura y validación en el Sistema de Captura y Trazabilidad de Datos Académicos (SCTDA).
2. Exportación estructurada (CSV/JSON).
3. Análisis en herramientas externas (Python, R, SPSS, Excel u otras).
4. Reportes académicos/operativos fuera del sistema.

Esto evita prometer funcionalidades analíticas no implementadas y mantiene coherencia producto-evidencia.

---

## 8) Restricciones usadas estratégicamente

| Restricción | Decisión tomada | Beneficio |
|---|---|---|
| Presupuesto $0 | Stack open source y arquitectura pragmática | Viabilidad real sin dependencia de licencias |
| Tiempo 4 meses | Priorizar base de datos/metodología sobre IA | Entrega defendible en plazo |
| Contexto universitario | Enfoque en trazabilidad y estandarización | Utilidad académica inmediata |
| Riesgo legal | Lenguaje legal duro sin sobrepromesa de cumplimiento integral | Credibilidad institucional |

---

## 9) Principios vs implementación vs cumplimiento (anti-overclaim)

| Capa | Qué es | Estado |
|---|---|---|
| Principios de diseño | Anonimización, minimización, separación identidad-métricas | Definidos |
| Implementación real | M1–M4 operativos; M5/M6 por cerrar | Parcial |
| Cumplimiento legal verificable | Evidencia integral formal aún no cerrada en MVP | En progreso |

---

## 10) Riesgos, gestión del cambio y supuestos

### Riesgos
- Sobreventa del discurso frente a evidencia parcial (M5/M6).
- Percepción de "sistema de carga" si no se comunica unidad de valor.
- Brechas legales/operativas si no se distingue estado actual vs objetivo.

### Gestión del cambio (estrategia de mitigación)

El esfuerzo principal **no es técnico sino de estandarización de proceso**. Para mitigar la resistencia de aplicadores e investigadores:

1. **Piloto controlado:** iniciar con un proyecto, un instrumento, 2-3 aplicadores de prueba. Demostrar valor antes de escalar.

2. **Capacitación estructurada:** incluir guía de uso, ejemplos de registro y sesiones de Q&A. El sistema es simple, pero requiere disciplina de captura.

3. **Incentivo de uso:**
   - Los investigadores reciben datos estructurados, no hojas de cálculo heterogéneas.
   - Exportación lista para análisis (CSV/JSON) sin limpieza manual.
   - Trazabilidad que limpia auditoría manual.

4. **Apoyo progresivo:**
   - Mes 1-2: soporte directo del equipo técnico.
   - Mes 3+: auto-gestión con documentación y经验的 acumulada.

### Supuestos críticos
- Habrá continuidad institucional para fase 2.
- Los equipos de investigación usarán análisis externo disciplinado.
- Se mantendrá gobernanza documental para evitar contradicciones.

---

## 11) Criterios de aceptación por fase

### Fase 1 (MVP)
- Captura completa y trazable de registros metodológicos.
- Control por roles operativo.
- Estructura exportable consistente.
- Evidencia de operación real en contexto académico.

### Criterios de Suficiencia de Datos (para transición Fase 1 → Fase 2)

Para declarar que la Fase 1 produce un dataset representativo y habilitar Fase 2 (analítica/IA):

| Criterio | Umbral mínimo | Fundamento Estadístico/Metodológico |
|---------|--------------|-----------------------------------|
| Volumen de registros | ≥ 500 aplicaciones únicas | Suficiente para EDA y muestreo representativo. n>30-100 cumple ley de grandes números. |
| Diversidad de instrumentos | ≥ 3 instrumentos activos | Garantiza variabilidad; evita sesgos por homogeneidad para generalización en IA. |
| Cobertura temporal | ≥ 3 meses de operación | Captura patrones estacionales (1 ciclo completo). |
| Diversidad de proyectos | ≥ 2 proyectos con datos | Generalización contextual cross-domain. |
| Usuarios activos | ≥ 5 aplicadores registrados | Variabilidad de actor; descriptiva viable con n=5-10. |

Estos criterios son **objetivos, verificables y escalables**. La transición requiere evidencia documental de cumplimiento (queries SQL auditables).

---

## 9.5) Perspectiva UX: Wizard Multi-Paso y Prevención de Fatiga

El wizard de registro operativo (M4) está diseñado para minimizar la carga cognitiva del aplicador:

**Mecanismos de reducción de fatiga:**

| Mecanismo | Descripción | Objetivo |
|-----------|-------------|----------|
| Pasos dividos | Registro en 4 pasos: proyecto, sujeto, contexto, métricas | Evita carga mental excesiva en un solo formulario |
| Validación inline | Validación en tiempo real por campo | Previene errores antes de enviar |
| Contexto persistente | El proyecto se selecciona una vez | Reduce repeticiones innecesarias |
| Estados de progreso | Indicadores visuales de avance | Reduce ansiedad de "no saber cuánto falta" |

**Prevención de GIGO por UX:**

- Cada paso muestra únicamente los campos relevantes al contexto.
- Métricas preconfiguradas según instrumento seleccionado.
- Campos obligatorios vs opcionales según definición del instrumento.

**Riesgo identificado:** aplicadores en entornos escolares pueden registrar múltiples sesiones consecutivas. El diseño debe soportar pausas y retomar sin pérdida de datos (estados intermedios).

---

## 9.6) Marco Ético Preliminar: Recolección Responsable de Datos

Dado que el objetivo final es IA, se establece desde ahora un marco ético que previene los sesgos mencionados en la crisis lingüística post-pandemia.

**Principios de equidad desde la captura:**

| Principio | Aplicación |
|---------|-----------|
| **Representatividad geográfica** | Captura distribuida en múltiples estados/regiones de México (no solo CDMX). |
| **Representatividad socioeconómica** | Inclusión de contextos urbanos, suburbanos y rurales. |
| **Representatividade de nivel socioeconómico** | Datos de contexto: tipo de escuela, nivel SES estimado. |
| **No discriminación algorítmica** | El dataset debe ser auditable por grupo demográfico antes de modelado. |
| **Transparencia de sesgo** | Documentar y reportar sesgos detectados en el dataset. |

**Criterios de diversificación para Fase 1 → Fase 2:**

| Criterio | Umbral mínimo | Justificación |
|---------|--------------|---------------|
| Estados representados | ≥ 5 estados diferentes | Diversidad geográfica del país |
| Tipos de escuela | ≥ 2 (pública/privada) | Variabilidad de recursos |
| Niveles educativos | ≥ 2 (preescolar/primaria) | Rango de desarrollo lingüístico |

**Nota:** Estos criterios son complementarios a los de suficiencia de datos. Un dataset representativo requiere tanto volumen como diversidad.

**Marco de gobernanza de sesgos:**

1. **Auditoría pre-modelado:** análisis exploratorio por variables demográficas antes de entrenar modelos.
2. **Umbrales de equidad:** métricas de disparidad de rendimiento entre grupos (antes de declarar listo para producción).
3. **Monitoreo continuo:** métricas de fairness en producción si se despliega IA.

*(Los detalles técnicos de implementación están en arquitectura.md y decisiones-tecnicas.md)*

### Fase 2 (Evolución)
- Dataset suficiente y validado para modelado (cumple criterios de suficiencia).
- Protocolo de validación científica definido.
- Diseño ético y metodológico para analítica/IA aprobado.

### Prioridad de desarrollo funcional (complementario)

**Prioridad A – Crítico (sin esto no hay sistema):**
1. Autenticación básica y restricción por rol
2. Gestión de instrumentos
3. Definición estructurada de métricas
4. Registro operativo anonimizado
5. Persistencia con integridad referencial

**Prioridad B – Necesario para investigación:**
6. Consulta interna básica
7. Exportación estructurada

*(Las decisiones técnicas de privacidad y seguridad están documentadas en decisiones-tecnicas.md)*

---

## 12) Preguntas probables y respuestas sugeridas (defensa)

### 12.1 Operación real y adopción institucional

**P: ¿Esto ya está listo para operar con investigadores reales?**  
**R:** Está listo para operación controlada en los flujos de captura y gobernanza (M1–M4 operativos con autenticación, gestión de proyectos, instrumentos, registro operativo, onboarding e instituciones). Para operación institucional completa falta cerrar M5/M6 (consulta paginada y exportación) y consolidar evidencia legal-operativa.

**P: ¿Qué esfuerzo requiere adoptarlo en mi institución?**  
**R:** Requiere tres frentes: (1) configuración de usuarios/roles, (2) definición metodológica de instrumentos/métricas, y (3) capacitación operativa de aplicadores. El esfuerzo principal no es técnico; es de estandarización de proceso.

**P: ¿Cómo se incorpora al flujo académico actual sin fricción?**  
**R:** El sistema se inserta en la etapa de levantamiento de datos. No reemplaza el análisis científico existente; lo ordena. El equipo sigue analizando en sus herramientas habituales, pero con datos más consistentes.

**P: ¿Cuál es la unidad de valor que produce el sistema?**  
**R:** La unidad de valor es el **registro metodológico trazable y exportable**: captura validada con contexto, instrumento, métrica y responsable operativo, lista para análisis externo.

### 12.2 Valor frente a alternativas simples

**P: ¿Por qué usar esto en lugar de Excel o Google Forms?**  
**R:** Porque esas herramientas no garantizan, por defecto, modelo de datos estable, trazabilidad end-to-end por rol, ni gobernanza metodológica. El SCTDA sí estructura el proceso y reduce variabilidad de captura.

**P: Si el sistema no analiza, ¿por qué sería estratégico?**  
**R:** Porque habilita la condición previa para análisis confiable: dato limpio, comparable y auditable. Sin esa base, cualquier análisis o IA posterior es frágil y difícil de defender.

**P: ¿Qué pasa si nunca se construye IA? ¿Sigue teniendo sentido?**  
**R:** Sí. El producto mantiene valor propio como plataforma de registro científico estandarizado para investigación institucional, aun sin capa de IA.

### 12.3 Datos, continuidad y resiliencia

**P: ¿Qué pasa si se pierde información o hay un error en captura?**  
**R:** El diseño contempla persistencia relacional, trazabilidad y control de acceso. A nivel de operación, debe acompañarse con política de respaldo, recuperación y control de cambios para minimizar pérdida y corregir errores sin romper trazabilidad.

**P: ¿Se pueden corregir errores sin comprometer integridad metodológica?**  
**R:** Sí, mediante reglas de edición controlada y auditoría de cambios. La lógica es corregir con rastro, no borrar sin evidencia.

**P: ¿Cómo manejan migraciones y rollback?**  
**R:** Las migraciones de esquema están contempladas con tooling de versionado. El rollback debe operar como procedimiento controlado por entorno, con validación previa y respaldo de datos.

### 12.4 Evolución metodológica

**P: ¿Qué tan rápido podemos incorporar nuevas métricas o instrumentos?**  
**R:** Es una capacidad central del sistema. El diseño permite agregar y ajustar instrumentos/métricas de forma estructurada sin rediseñar toda la plataforma.

**P: ¿Qué pasa si cambia el marco metodológico a mitad del proyecto?**  
**R:** El sistema está pensado para evolución controlada: se actualizan configuraciones metodológicas y se preserva trazabilidad histórica para no mezclar criterios viejos y nuevos.

### 12.5 Privacidad, identidad y marco legal

**P: ¿Qué garantía tengo de que los datos no se mezclen con identidad personal?**  
**R:** La arquitectura separa identidad y registro operativo bajo principios de anonimización y minimización. El objetivo es impedir que la captura metodológica dependa de PII directa.

**P: ¿Puedo exportar mis datos fácilmente si termino el contrato?**  
**R:** El alcance funcional del producto contempla exportación estructurada (CSV/JSON). El estado actual la tiene como cierre pendiente en M6; por eso se comunica como compromiso funcional con implementación en curso.

**P: ¿Están declarando cumplimiento legal total en MVP?**  
**R:** No. Se declara explícitamente que en MVP no hay cumplimiento normativo integral formal cerrado; se aplican principios de diseño y avance progresivo de evidencia verificable.

### 12.6 Gobernanza de datos y ética (complementario)

**Modelo de responsabilidades:**

- **Custodio del dato:** el sistema (plataforma) — almacena y gestiona datos.
- **Propietario del dato:** la institución o proyecto investigación — quien define qué se captura y para qué.
- **Usuario del dato:** investigador/aplicador autorizado — quien captura y analiza.

**Principios de tratamiento:**

- **Anonimización desde el diseño:** el sujeto recibe un código anónimo generado por el sistema, no se usa identificador personal.
- **Minimización:** solo se captura lo necesario para el análisis metodológico.
- **Separación identidad-métricas:** la tabla de identidad y la tabla de registros operativos están separadas y linkeables solo por clave técnica.

**Marco legal implementados (documentos reales):**

| Documento | Ubicación | Versión | Marco |
|-----------|-----------|--------|-------|
| Términos y Condiciones | `mock/src/data/terms-of-service.js` | v1.1 | Leyes mexicanas |
| Aviso de Privacidad | `mock/src/data/privacy-notice.js` | v1.2 | LFPDPPP |
| Licencia de Software | `LICENSE` (raíz) | MIT | MIT License |

**Derechos ARCO/LGPD (LFPDPPP):**

- El diseño contempla la arquitectura para soportar derechos de Acceso, Rectificación, Cancelación y Oposición.
- No se almacena PII directa en registros operativos.
- Respuesta en 20 días hábiles (prórroga por complejidad).

**Nota sobre cookies:** El sistema **no utiliza** cookies de rastreo, publicidad ni analítica de terceros.

**Consentimiento informado:**

- El sistema NO implementa captura de consentimiento en fase MVP.
- Se asume que el aplicador tiene autorización institucional para registrar métricas del contexto educativo.
- La fase de cumplimiento formal integral se declara como desarrollo futuro, no como parte del MVP.

### 12.7 Arquitectura, seguridad y calidad

**P: ¿Cómo prueban consistencia entre entorno de desarrollo y backend real?**  
**R:** Se trabaja con contratos, pruebas automatizadas y validación cruzada de flujos críticos. El objetivo es evitar divergencia entre comportamiento esperado y producción.

**P: ¿Qué cobertura tienen de seguridad y autorización?**  
**R:** El enfoque es Zero Trust: autenticación, validación por rol y controles de estado por solicitud, con auditoría de eventos sensibles. Los pendientes se gestionan como brechas explícitas, no ocultas.

**P: ¿Cuál es el riesgo técnico principal hoy?**  
**R:** No es la tecnología base, sino la brecha entre alcance funcional total y estado actual (especialmente M5/M6 y cierres legales-operativos).

**P: ¿Cómo se gestiona el riesgo de overclaim?**  
**R:** Separando tres capas en toda comunicación: (1) principios de diseño, (2) implementación disponible, (3) cumplimiento legal verificable.

### 12.8 Preguntas estratégicas difíciles

**P: ¿Cambiaron de IA a captura porque fracasó la idea original?**  
**R:** No. Es una decisión de secuencia: primero infraestructura de datos confiable, después analítica/IA. Es una ruta más sólida y defendible científicamente.

**P: ¿Quién sufre hoy y qué problema concreto resuelve ya?**  
**R:** Equipos académicos que capturan datos de forma heterogénea y poco trazable. El sistema reduce desorden metodológico y mejora la calidad utilizable del dato.

**P: ¿Cuál es el principal diferenciador real?**  
**R:** No es “tener formularios”, sino combinar estandarización metodológica, trazabilidad operativa y gobernanza de datos orientada a investigación.

**P: ¿Por qué debería confiar en la evolución a fase 2?**  
**R:** Porque la fase 1 produce el activo indispensable (dataset trazable y consistente) y define criterios de transición objetivos, no promesas abiertas.

---

## 13) Cierre narrativo

Este proyecto no abandonó su visión; **la volvió ejecutable**. La estrategia adoptada prioriza evidencia sobre discurso: construir primero la base metodológica de datos que hace posible, en una siguiente fase, cualquier análisis avanzado o IA con rigor científico y viabilidad institucional.
