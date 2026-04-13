# Guía de Estructura — Memoria de Proyecto

**Taller de Proyecto de Centros de Datos y Redes**

> Esta guía define **qué debe contener** cada sección y **cómo se evalúa** que esté bien hecha.
> No es un borrador para rellenar. Es un marco de referencia.

## Secciones obligatorias y criterios de aceptación

### 1. Portada

**Contiene:**

- Título completo del proyecto
- Nombre(s) del autor o autores
- Asignatura, carrera y periodo académico

**Criterio de aceptación:**
El título debe ser descriptivo e informativo por sí solo, sin necesidad de leer el resto del documento. Evitar títulos genéricos o ambiguos.

---

### 2. Resumen / Abstract

**Contiene:**

- Resumen en español (máximo 200 palabras)
- Abstract en inglés (máximo 200 palabras)
- Hasta 5 palabras clave en ambos idiomas

**Criterio de aceptación:**
El resumen debe responder en una sola lectura: qué problema resuelve el proyecto, qué se construyó, qué metodología se usó y cuál fue el resultado principal. No es una introducción extendida ni una lista de temas. Si alguien externo no entiende de qué trata el proyecto, debe reescribirse.

---

### 3. Índice

**Contiene:**

- Listado de todas las secciones y subsecciones con su número de página
- Numeración jerárquica consistente (1, 1.1, 1.2, 2, 2.1…)

**Criterio de aceptación:**
Debe coincidir exactamente con los títulos y números de página del documento. Se genera al final, no al inicio.

---

### 4. Introducción

**Contiene:**

- Presentación del problema que motiva el proyecto
- Justificación de su relevancia
- Descripción breve de la estructura del documento
- Delimitación del alcance (qué abarca y qué no)

**Puntos a considerar:**

- El problema debe ser inevitable, no opcional
- Evitar describir el tema en lugar de plantear el problema
- La relevancia debe demostrarse, no declararse
- Cuidar el salto lógico problema → solución
- Delimitar como defensa, no como trámite
- Mantener un nivel de especificidad adecuado
- Hacer explícitos los supuestos
- Asegurar coherencia con el resto del documento
- Evitar redundancia
- Priorizar la síntesis

**Criterio de aceptación:**
Debe quedar claro el problema real que se ataca, no solo el sistema construido. La justificación debe apoyarse en contexto (social, técnico o institucional), no en opiniones. La delimitación evita malentendidos sobre el alcance.

---

### 5. Objetivos

**Contiene:**

- Un objetivo general
- Entre 5 y 8 objetivos específicos

**Criterio de aceptación:**
Cada objetivo debe ser verificable: se cumple o no.
Evitar verbos vagos como “conocer”, “entender” o “explorar”. Usar verbos de acción: diseñar, implementar, definir, evaluar, documentar.
Los objetivos específicos deben derivarse del general, no ser paralelos.

---

### 6. Metodología y Fases

**Contiene:**

- Enfoque metodológico adoptado (ágil, formal o híbrido) y justificación
- Instrumentos y herramientas utilizados para la gestión y el desarrollo
- Tabla o esquema de las fases del proyecto con sus semanas y entregables
- Limitaciones enfrentadas durante el desarrollo

**Criterio de aceptación:**
Debe explicarse el *por qué* de las decisiones, no solo describirlas.
Las limitaciones son obligatorias y deben ser honestas.
Las fases deben reflejar lo que ocurrió, no lo planeado.

---

### 7. Marco Teórico / Fundamentación

**Contiene:**

- Bases conceptuales que sustentan las decisiones técnicas del proyecto
- Referencias a estándares, marcos normativos o literatura académica relevante
- Solo los conceptos que el proyecto efectivamente aplicó

**Criterio de aceptación:**
No es un glosario. Cada concepto debe vincularse con una decisión real.
Si se menciona un estándar (NIST, OWASP, GDPR), debe citarse en APA 7ª y justificarse su uso.
Extensión sugerida: 4 a 7 conceptos bien desarrollados.

---

### 8. Desarrollo del Proyecto

**Contiene:**

- Descripción detallada de cada fase de ejecución
- Decisiones técnicas relevantes tomadas en cada etapa y su justificación
- Dificultades encontradas y cómo se resolvieron
- Evidencia del avance (arquitectura, módulos, herramientas, laboratorios)

**Criterio de aceptación:**
Es la sección principal y más extensa. No es un listado de actividades: debe haber análisis. Se debe explicar *qué* se hizo, *por qué* y con *qué implicaciones*. Usar terminología técnica precisa y apoyarse en diagramas cuando sea útil.

---

### 9. Análisis de Resultados

**Contiene:**

- Resultados obtenidos
- Interpretación en relación con los objetivos
- Datos cuantitativos cuando aplique

**Criterio de aceptación:**
Debe responder directamente a los objetivos. Si alguno no se cumplió, debe explicarse. No se trata de justificar éxito, sino de evaluar con honestidad.

---

### 10. Conclusiones y Recomendaciones

**Contiene:**

- Evaluación del cumplimiento de objetivos
- Análisis crítico de fortalezas y debilidades
- Recomendaciones para trabajo futuro

**Criterio de aceptación:**
No deben repetir el desarrollo ni el resumen.
Deben derivar de un análisis crítico.
Las recomendaciones deben ser accionables y priorizadas.

---

### 11. Bibliografía

**Contiene:**

- Todas las fuentes citadas en el documento, en formato APA 7ª edición
- Solo fuentes que aparecen citadas en el texto (no lecturas complementarias)

**Formato APA 7 obligatoria:**

- Lista titulada Referencias (o Bibliografía) [Link referencia](https://apastyle.apa.org/style-grammar-guidelines/references/lists-vs-bibliographies)
- Orden alfabético por autor [Link referencia](https://apastyle.apa.org/style-grammar-guidelines/paper-format/reference-list)
- Sangría francesa (0.5 pulgadas)
- Citas en texto autor-año [Link referencia](https://apastyle.apa.org/style-grammar-guidelines/citations/basic-principles/author-date)

**Fuentes priorizadas:**

| Prioridad | Tipo | Ejemplo |
|---|---|---|
| 1 | Estándares | NIST, ISO [Link referencia](https://www.nist.gov/nist-research-library/reference-format-nist-publications) |
| 2 | Documentación oficial | [Manuales APA](https://apastyle.apa.org/style-grammar-guidelines/references/examples), [Purdue OWL](https://owl.purdue.edu/owl/research_and_citation/apa_style/apa_formatting_and_style_guide/index.html) |
| 3 | Artículos académicos | [Revistas indexadas](https://apastyle.apa.org/style-grammar-guidelines/references/examples) |

**Criterio de aceptación:**
Toda afirmación técnica externa debe estar citada.
Mínimo esperado: 10 fuentes de calidad.
No usar como fuente principal Wikipedia, blogs sin autor o tutoriales de YouTube.

---

### 12. Anexos

**Contiene:**

- Documentación complementaria extensa
- Ejemplos: endpoints, inventarios, decisiones arquitectónicas, glosario

**Criterio de aceptación:**
Todo anexo debe estar referenciado en el documento.
Complementa, no reemplaza, la explicación principal.

---

## Lo que se evalúa globalmente

| Criterio | Descripción |
|---|---|
| **Coherencia interna** | Los objetivos, el desarrollo, los resultados y las conclusiones forman un hilo lógico continuo |
| **Rigor técnico** | Las decisiones se fundamentan en estándares o criterios verificables, no en preferencias |
| **Honestidad sobre limitaciones** | El documento reconoce lo que no se pudo hacer y por qué |
| **Precisión del lenguaje** | Uso correcto de terminología técnica; sin ambigüedad ni lenguaje coloquial |
| **Citación** | Toda fuente externa está correctamente citada en APA 7ª |
| **Extensión adecuada** | Ni excesivamente breve (vacío de contenido) ni innecesariamente larga (relleno sin valor) |

---

> **Regla general:** Si una sección puede eliminarse sin afectar la coherencia del documento, no está bien justificada o no debería existir.
