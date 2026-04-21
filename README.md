# Sistema de Registro Metodológico de Métricas Lingüísticas

[![Tests](https://github.com/Angel-crypt/methodology-core/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/Angel-crypt/methodology-core/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![JavaScript](https://img.shields.io/badge/-JavaScript_ES2020+-F7DF1E?style=flat&logo=javascript&logoColor=white)
![Python](https://img.shields.io/badge/-Python_3.11+-3776AB?style=flat&logo=python&logoColor=white)

Herramienta académica para registrar métricas lingüísticas de forma estructurada, trazable y anónima, orientada a estudios de investigación metodológica y desarrollo lingüístico.

## Tabla de contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Datos y privacidad](#datos-y-privacidad)
- [Arquitectura](#arquitectura)
- [Inicio rápido](#inicio-rápido)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Estado actual](#estado-actual)
- [Documentación](#documentación)
- [Contribuciones](#contribuciones)
- [Licencia](#licencia)

## Descripción

Este sistema centraliza el registro de evaluaciones lingüísticas para evitar dispersión de datos, mejorar la trazabilidad de cada aplicación y facilitar la generación de datasets consistentes para análisis posteriores.

El proyecto está diseñado para:

- Registrar aplicaciones de instrumentos lingüísticos de forma estructurada.
- Mantener trazabilidad de usuario, fecha, instrumento y métricas.
- Proteger la identidad de los sujetos mediante identificadores anónimos.
- Permitir consulta y exportación de datos para investigación.

## Características

- Gestión de proyectos e instrumentos metodológicos.
- Registro operativo de sujetos y evaluaciones.
- Control de acceso por roles.
- Generación de datasets anonimizados.
- Trazabilidad y auditoría de acciones relevantes.

## Datos y privacidad

El sistema diferencia entre usuarios operativos e información de sujetos de estudio.

- **Usuarios operativos:** correo institucional, rol, estado de cuenta y registros de sesión/auditoría.
- **Sujetos de estudio:** identificador UUID y datos contextuales genéricos necesarios para fines metodológicos.
- **No se almacenan datos personales directos** de los sujetos de estudio.
- Se aplica minimización de datos y anonimización conforme a la LFPDPPP.

Para detalles normativos y operativos, consulta el Aviso de Privacidad y la documentación legal del proyecto.

## Arquitectura

| Componente | Tecnología |
|-----------|------------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Mock server | Node.js + Express |
| Despliegue | k3s + Ansible |
| Testing | Vitest, Jest |

### Roles principales

| Rol | Descripción |
|-----|-------------|
| `superadmin` | Administración general del sistema |
| `researcher` | Consulta y exportación de datos anonimizados |
| `applicator` | Registro operativo de sujetos y evaluaciones |

## Inicio rápido

### Requisitos

- Node.js 20+
- Python 3.11+
- `make`
- `kubectl`, `k3s`, `ansible` (solo para despliegue)

### Clonar el repositorio

```bash
git clone https://github.com/Angel-crypt/methodology-core.git
cd methodology-core
make help
```

### Desarrollo local

```bash
make backend-install
make backend-dev

mkae frontend-install
make frontend-dev

make mocke-install
make mock-dev
```

### Tests

```bash
cd frontend && npm install && npm test
cd ../mock && npm install && npm test
```

### Despliegue con k3s

```bash
make k3s-deploy-mock
make k3s-deploy-real
```

## Estructura del proyecto

```text
methodology-core/
├── frontend/      # Aplicación React
├── backend/       # API Python
├── mock/          # Servidor mock para pruebas
├── ansible/       # Playbooks de despliegue
├── docs/          # Documentación técnica y funcional
├── scripts/       # Scripts auxiliares
└── Makefile       # Comandos de desarrollo
```

## Estado actual

### Operativo

- Autenticación
- Gestión de instrumentos
- Definición de métricas
- Registro operativo
- Documentación legal base

### En progreso

- Consulta interna
- Exportación estructurada

## Contribuciones

Proyecto académico en desarrollo.

1. Revisa `docs/contributing/commit_conventions.md`.
2. Abre un issue antes de cambios mayores.
3. Ejecuta lint y tests antes de enviar un PR.

### Convención de commits

```bash
feat: agregar módulo de exportación
fix: corregir redirección en sesión expirada
docs: actualizar README
test: agregar tests para autenticación
```

## Licencia

MIT License © 2026 Equipo de Registro Metodológico de Métricas Lingüísticas

Consulta el archivo [LICENSE](LICENSE) para más detalles.

## Contacto

Para dudas o soporte, contacta al administrador del sistema.
