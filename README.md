# Sistema de Registro de Métricas Lingüísticas

> Herramienta académica para capturar métricas lingüísticas de forma estructurada, trazable y anónima, facilitando la creación de conjuntos de datos científicos confiables.

---

## ¿Qué es este sistema?

El Sistema de Registro de Métricas Lingüísticas es una herramienta para investigadores y lingüistas que necesitan **registrar datos sobre la producción del lenguaje de manera sistemática y segura.**

El sistema asegura que los registros sean **anónimos**, de modo que ningún dato permita identificar a los sujetos del estudio. Al mismo tiempo, cada registro es **trazable y verificable**, garantizando la integridad científica de los datos recopilados.

En esta fase inicial, el sistema **solo captura y organiza datos**; el análisis y la interpretación quedan en manos de los investigadores.

---

## ¿Cómo funciona?

El flujo de trabajo del sistema tiene tres etapas:

1. Un **administrador** configura los instrumentos de medición y define las métricas a capturar según los objetivos del estudio.
2. Los **operadores** registran observaciones lingüísticas de los sujetos sin almacenar ningún dato personal que permita identificarlos.
3. El sistema guarda los registros con trazabilidad completa y permite consultarlos y exportarlos en formatos estructurados para análisis posteriores.

```
[Administrador]          [Operador]            [Investigador]
      │                      │                       │
      ▼                      ▼                       ▼
Configura            Registra              Consulta y exporta
instrumentos   →   observaciones   →      los datos para
y métricas       (sin datos              análisis externo
                 identificatorios)
```

---

## Funcionalidades principales

| Módulo | Qué hace |
|--------|----------|
| **Autenticación y Acceso** | Gestiona usuarios, roles y permisos de acceso al sistema |
| **Gestión de Instrumentos** | Permite crear y administrar los instrumentos de medición del estudio |
| **Definición de Métricas** | Define qué se va a medir: tipo de dato, rangos válidos, obligatoriedad |
| **Registro Operativo** | Captura las observaciones lingüísticas de forma anónima y trazable |
| **Consulta Interna** | Permite buscar y filtrar registros almacenados |
| **Exportación Estructurada** | Exporta los datos en formatos utilizables para análisis científico |

---

## Estructura del proyecto

Este repositorio contiene tres partes principales:

### Frontend
Interfaz de usuario del sistema. Todo lo que el usuario ve e interactúa.
→ Ver instrucciones de uso en [`frontend/README.md`](./frontend/README.md)

### Backend
Lógica del servidor y base de datos del sistema.
→ Documentación disponible próximamente — ver requerimientos en [`docs/srs/`](./docs/srs/)

### Mock Server
Servidor de simulación para desarrollo. Permite al equipo de frontend desarrollar y probar la interfaz sin depender del backend real.
→ Ver instrucciones de uso en [`mock/README.md`](./mock/README.md)

---

## ¿Por dónde empiezo?

| Quiero... | Ve a... |
|-----------|---------|
| Entender el proyecto a fondo | [`docs/`](./docs/) |
| Desarrollar el frontend | [`frontend/README.md`](./frontend/README.md) |
| Usar o modificar el Mock Server | [`mock/README.md`](./mock/README.md) |
| Ver los requerimientos del sistema | [`docs/srs/`](./docs/srs/) |
| Ver el estado de los READMEs internos | [`README_STATUS.md`](./README_STATUS.md) |

---

## Estado del proyecto

El sistema se encuentra en **desarrollo activo**. Los módulos de autenticación, gestión de instrumentos, definición de métricas y registro operativo están especificados y cuentan con un Mock Server funcional que permite el desarrollo del frontend de forma independiente.

El backend real está pendiente de implementación. Los módulos de consulta interna y exportación estructurada están especificados en el backlog.

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [`docs/srs/`](./docs/srs/) | Especificaciones de requerimientos del sistema (SRS) |
| [`docs/BACKLOG.pdf`](./docs/BACKLOG.pdf) | Backlog del proyecto con historias de usuario |
| [`docs/CONTEXTO.pdf`](./docs/CONTEXTO.pdf) | Contexto general del proyecto |
| [`BITACORA.md`](./BITACORA.md) | Decisiones arquitectónicas y análisis de brechas |
