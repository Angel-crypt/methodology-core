<!-- PARA AGENTES IA: lee esta sección antes de cualquier tarea de desarrollo -->
# Sistema de Perfiles Lingüísticos — Frontend

> Interfaz web React + Vite que implementa el Design System del proyecto y sirve como capa de presentación para la gestión de usuarios, instrumentos, métricas y registros operativos.

## Orientación para agentes IA

Antes de implementar cualquier cosa en este proyecto, lee en orden:

1. Esta sección completa
2. `DESIGN_SYSTEM.md` — fuente de verdad visual (tokens, colores, tipografía, espaciado)
3. Los archivos en `src/styles/tokens/` — definiciones exactas de CSS custom properties
4. La sección "Convenciones" de este README

**Reglas fundamentales para agentes:**

- **No crear componentes que ya existen** en `src/components/app/` (ver sección 8)
- **No hardcodear valores** que existen como token CSS (`var(--color-primary)`, `var(--space-4)`, etc.)
- **Biblioteca de íconos oficial: `lucide-react`** — nunca SVGs inline ni otra biblioteca
- **Importar componentes siempre desde el barrel**: `import { Button } from '../components/app'`
- **No usar clases de colores genéricas de Tailwind** (`text-blue-500`, `bg-red-400`) — usar los tokens del DS
- **Toda clase CSS dinámica debe aparecer como string completa** en algún archivo de código (Tailwind JIT purga las dinámicas)

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Desarrollo local](#2-desarrollo-local)
3. [Docker](#3-docker)
4. [Scripts disponibles](#4-scripts-disponibles)
5. [Stack tecnológico](#5-stack-tecnológico)
6. [Estructura del proyecto](#6-estructura-del-proyecto)
7. [Design System — referencia rápida](#7-design-system--referencia-rápida)
8. [Componentes disponibles](#8-componentes-disponibles)
9. [Convenciones de desarrollo](#9-convenciones-de-desarrollo)
10. [Cómo desarrollar un nuevo módulo](#10-cómo-desarrollar-un-nuevo-módulo)
11. [Documentos de referencia](#11-documentos-de-referencia)

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Node.js | 22 LTS | Recomendado para coincidir con la imagen Docker (`node:22-alpine`). Vite 7 requiere Node ≥18. |
| npm | 10.x | Incluido con Node 22 LTS |
| Docker | 24.x | Solo necesario para el flujo Docker |
| Docker Compose | v2.x | Plugin integrado (`docker compose`) |

> El `package.json` no declara un campo `engines`. La versión Node 22 LTS se recomienda para coincidir exactamente con la imagen base del Dockerfile.

---

## 2. Desarrollo local

### Instalación

```bash
cd frontend
npm install
```

### Variables de entorno

```bash
cp .env.example .env
```

| Variable | Tipo | Descripción | Requerida | Ejemplo |
|----------|------|-------------|-----------|---------|
| `VITE_API_URL` | Build-time (pública) | URL base del backend API. Se quema en el bundle JS durante `npm run build` o `docker build`. No incluir secretos. | No (dev usa proxy) | `http://localhost:3000` / `https://api.midominio.com` |
| `FRONTEND_PORT` | Runtime | Puerto del host donde nginx expone el frontend. Solo aplica en Docker. | No | `80` |

**Sobre el prefijo `VITE_`:** Toda variable con este prefijo se **incorpora al bundle JavaScript en tiempo de compilación**. No están disponibles en runtime del servidor. Si cambia `VITE_API_URL`, hay que volver a compilar (o reconstruir la imagen Docker).

### Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor arranca en `http://localhost:5173`

**Galería de componentes**: `http://localhost:5173/gallery`

La ruta `/gallery` muestra todos los componentes del DS con sus variantes y props. Actualmente es la única página de la app (todas las rutas no reconocidas redirigen a `/gallery`).

### Proxy de API

El servidor de dev tiene un proxy configurado en `vite.config.js`:

- Peticiones a `/api/*` → `http://localhost:3000` (mock server local)
- `changeOrigin: true` — reescribe el `Host` header

En producción (Docker) la URL del backend se configura via `VITE_API_URL` en el `.env` antes del build.

---

## 3. Docker

```bash
# 1. Preparar variables de entorno
cp .env.example .env
# Editar .env — completar VITE_API_URL con la URL real del backend

# 2. Construir imagen y levantar contenedor
docker compose up --build

# El frontend queda disponible en http://localhost:80

# 3. Verificar que el contenedor responde
curl http://localhost/health  # → ok

# Levantar en background
docker compose up --build -d

# Ver logs en tiempo real
docker compose logs -f frontend

# Shell al contenedor (debug)
docker exec -it spl-frontend sh

# Detener
docker compose down

# Reconstruir tras cambios en código
docker compose up --build --force-recreate
```

**Importante — Variables build-time vs runtime:**

| Variable | Tipo | Descripción | Cuándo cambia |
|----------|------|-------------|---------------|
| `VITE_API_URL` | Build-time (pública) | URL del backend API, quemada en el bundle JS | Requiere `--build` |
| `FRONTEND_PORT` | Runtime | Puerto del host donde nginx escucha | Solo reiniciar el contenedor |

Las variables `VITE_*` se **queman en el bundle JS** durante `docker build`. Si cambia `VITE_API_URL`, debes reconstruir la imagen con `docker compose up --build`.

**Detalles del build multi-stage:**

- **Stage 1** (`node:22-alpine`): instala dependencias con `npm ci --frozen-lockfile`, compila el bundle con `npm run build`
- **Stage 2** (`nginx:alpine`): copia el bundle desde `/app/dist` y sirve con nginx. No hay Node en producción.

El contenedor se llama `spl-frontend`, la imagen `spl-frontend:latest`. Puerto del host configurable via `FRONTEND_PORT` (default: `80`).

---

## 4. Scripts disponibles

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Servidor de desarrollo con HMR en `http://localhost:5173` |
| `build` | `vite build` | Compilación de producción en `dist/` |
| `preview` | `vite preview` | Previsualizar el bundle de producción localmente |
| `lint` | `eslint .` | Linting con ESLint 9 (flat config) |

---

## 5. Stack tecnológico

### Framework y lenguaje

| Tecnología | Versión | Rol |
|------------|---------|-----|
| React | `^18.3.1` | UI framework |
| JavaScript (ES2022) | — | Lenguaje (sin TypeScript) |
| Vite | `^7.3.1` | Bundler y servidor de dev |
| @vitejs/plugin-react-swc | `^3.5.0` | Compilación React con SWC (más rápido que Babel) |
| react-router-dom | `^6.30.3` | Client-side routing |

**Nota importante**: este proyecto usa **JavaScript**, no TypeScript. No hay `tsconfig.json`. El `jsconfig.json` solo configura path aliases para autocompletado en el editor.

### Estilos

| Tecnología | Versión | Rol |
|------------|---------|-----|
| Tailwind CSS | `^3.4.19` | Utility classes |
| CSS Custom Properties | — | Tokens del Design System (fuente de verdad de valores) |
| @fontsource/inter | `^5.2.8` | Fuente Inter self-hosted (pesos 400 y 500) |

La estrategia de estilos es **híbrida**:

- Los **componentes del DS** usan clases CSS semánticas definidas en `src/index.css` (`.btn`, `.card`, `.sidebar-item`, `.data-table`, etc.)
- Los **layouts y páginas** pueden usar Tailwind utilities
- Los **valores de color, tipografía y espaciado** siempre vienen de tokens CSS (`var(--color-primary)`, no `#5DCAA5`)

### Íconos

Este proyecto usa **lucide-react** (`^0.577.0`) como biblioteca oficial de íconos.

```jsx
// Correcto — importar de lucide-react
import { Search, Plus, Trash2, ChevronDown } from 'lucide-react'

// Uso en componente
<Search size={16} aria-hidden="true" />
```

**Tamaños estándar por contexto:**

| Contexto | `size` prop |
|----------|-------------|
| Botón sm | `14`–`16` |
| Botón md | `16` |
| Botón lg | `18` |
| Standalone / decorativo | `20`–`24` |
| Sidebar / nav items | `20` |
| Badges, labels inline | `12` |

**Reglas:**

- Nunca SVGs hardcodeados (`<svg>...</svg>` en JSX)
- Nunca importar de otra biblioteca (`react-icons`, `heroicons`, `phosphor`)
- Siempre `aria-hidden="true"` en íconos decorativos
- Siempre `aria-label` en botones que solo tienen ícono

### Librerías de soporte

| Librería | Versión | Qué resuelve |
|----------|---------|--------------|
| `@radix-ui/react-dialog` | `^1.1.15` | Focus trap, `aria-modal`, Escape nativo en Modal |
| `@radix-ui/react-label` | `^2.1.8` | Label accesible en FormField |
| `@radix-ui/react-slot` | `^1.2.4` | Composición de componentes (primitivos shadcn) |
| `@radix-ui/react-toast` | `^1.2.15` | Instalado como dependencia shadcn; no usado activamente |
| `axios` | `^1.13.6` | HTTP client para llamadas a la API (para uso en páginas futuras) |
| `clsx` | `^2.1.1` | Composición condicional de clases CSS |
| `tailwind-merge` | `^3.5.0` | Resolución de conflictos en clases Tailwind |
| `class-variance-authority` | `^0.7.1` | Variantes de componentes (usado en capa `ui/`) |

La función `cn()` en `src/lib/utils.js` combina `clsx` + `tailwind-merge` para composición segura de clases.

### Servidor de producción

La imagen Docker usa **nginx:alpine** (no Node) para servir el bundle estático. nginx maneja:

- SPA fallback: todas las rutas sirven `index.html` (routing del lado del cliente)
- Gzip: habilitado para JS, CSS, JSON, SVG, XML
- Cache de assets: `Cache-Control: public, immutable` con `expires 1y` para archivos con hash de contenido (Vite añade hash a los nombres)
- Health check: endpoint `/health` retorna `200 ok` (texto plano)
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

---

## 6. Estructura del proyecto

```
frontend/
├── public/
│   └── favicon.svg              # Favicon del proyecto
├── src/
│   ├── components/
│   │   ├── app/                 # Librería de componentes del DS — usar siempre estos
│   │   │   ├── Alert.jsx        # Alerta estática inline (info/success/warning/error)
│   │   │   ├── Button.jsx       # Botón DS con variantes y tamaños
│   │   │   ├── DataTable.jsx    # Tabla de datos con skeleton y empty state
│   │   │   ├── EmptyState.jsx   # Placeholder de contenido vacío
│   │   │   ├── FormField.jsx    # Label + input + helper/error accesible
│   │   │   ├── Modal.jsx        # Modal con focus trap via @radix-ui/react-dialog
│   │   │   ├── RoleBadge.jsx    # Badge de rol de usuario (admin/researcher/aplicador)
│   │   │   ├── Sidebar.jsx      # Barra de navegación lateral con NavLink
│   │   │   ├── SkeletonRow.jsx  # Fila skeleton animada para tablas
│   │   │   ├── Spinner.jsx      # Indicador de carga animado
│   │   │   ├── StatusBadge.jsx  # Badge de estado (active/inactive/pending)
│   │   │   ├── Toast.jsx        # Notificación toast + ToastContainer
│   │   │   ├── Typography.jsx   # Texto semántico con tokens DS
│   │   │   ├── useToast.js      # Hook para gestión de toasts
│   │   │   └── index.js         # ← Barrel export — importar siempre desde aquí
│   │   └── ui/                  # Primitivos Radix/shadcn (base interna — no usar directamente en páginas)
│   │       ├── alert.jsx
│   │       ├── badge.jsx
│   │       ├── button.jsx
│   │       ├── card.jsx
│   │       ├── dialog.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       └── table.jsx
│   ├── pages/
│   │   └── GalleryPage.jsx      # Galería de componentes — ruta /gallery
│   ├── styles/
│   │   └── tokens/              # CSS Custom Properties del Design System
│   │       ├── colors.css       # Paleta de colores y tokens semánticos
│   │       ├── typography.css   # Escala tipográfica, pesos, interlineado
│   │       ├── spacing.css      # Espaciado, radios, bordes, layout
│   │       └── index.css        # Barrel de tokens (importa los tres anteriores)
│   ├── lib/
│   │   └── utils.js             # cn() — composición segura de clases CSS
│   ├── App.jsx                  # Router principal (BrowserRouter + Routes)
│   ├── main.jsx                 # Entry point — monta <App /> en #root
│   └── index.css                # Estilos globales: Inter, tokens, Tailwind, clases DS
├── Dockerfile                   # Multi-stage: node:22-alpine (build) → nginx:alpine (serve)
├── docker-compose.yml           # Servicio spl-frontend con healthcheck
├── nginx.conf                   # Config nginx: SPA fallback, gzip, cache, /health
├── .env.example                 # Variables de entorno documentadas
├── vite.config.js               # Alias @/, proxy /api → localhost:3000, HMR
├── tailwind.config.js           # Colores, fuentes, radios, sombras, safelist
├── jsconfig.json                # Path alias @/ → ./src/ (para el editor)
└── package.json                 # Dependencias y scripts
```

**Alias de paths**: `@/` apunta a `src/`

```jsx
import { Button } from '@/components/app'       // Correcto
import { Button } from '../../../components/app' // Incorrecto — no usar rutas relativas largas
```

**Dos capas de componentes:**

- `src/components/app/` — componentes del DS de alto nivel. Usar en páginas.
- `src/components/ui/` — primitivos Radix/shadcn (base interna). No usar directamente en páginas nuevas; son la base sobre la que se construyen los de `app/`.

---

## 7. Design System — referencia rápida

El Design System completo está en `DESIGN_SYSTEM.md`. Esta sección es una referencia rápida operativa.

### Tokens de color principales

| Token | Valor resuelto | Uso |
|-------|---------------|-----|
| `--color-primary` | `#5DCAA5` (sage-400) | CTA, botón primario, borde focus |
| `--color-primary-hover` | `#1D9E75` (sage-500) | Hover de elementos primarios |
| `--color-primary-dark` | `#0F6E56` (sage-600) | Borde énfasis, texto sobre sage-50 |
| `--color-primary-light` | `#E1F5EE` (sage-50) | Fondo éxito, badge investigador |
| `--color-surface` | `#FFFFFF` | Cards, inputs, modales |
| `--color-bg-page` | `#F1EFE8` (gray-50) | Fondo de página |
| `--color-bg-subtle` | `#E8E6DF` (gray-100) | Hover de filas, fondo de código |
| `--color-text-primary` | `#2C2C2A` (gray-900) | Texto de contenido principal |
| `--color-text-secondary` | `#5F5E5A` (gray-600) | Descripciones, metadatos |
| `--color-text-tertiary` | `#888780` (gray-400) | Timestamps, notas |
| `--color-text-placeholder` | `#B4B2A9` | Hint en inputs |
| `--color-error` | `#F09595` (coral-400) | Borde/ícono de error |
| `--color-error-text` | `#A32D2D` (coral-600) | Texto de error |
| `--color-error-bg` | `#FCEBEB` (coral-50) | Fondo de estado error |
| `--color-warning` | `#EF9F27` (amber-400) | Borde/ícono de advertencia |
| `--color-warning-text` | `#854F0B` (amber-600) | Texto de advertencia |
| `--color-warning-bg` | `#FAEEDA` (amber-50) | Fondo de advertencia |
| `--color-success` | `#5DCAA5` (sage-400) | Borde/ícono de éxito |
| `--color-success-text` | `#0F6E56` (sage-600) | Texto de éxito |
| `--color-success-bg` | `#E1F5EE` (sage-50) | Fondo de éxito |
| `--color-info` | `#378ADD` (blue-400) | Borde/ícono informativo |
| `--color-info-text` | `#185FA5` (blue-600) | Texto informativo |
| `--color-info-bg` | `#E6F1FB` (blue-50) | Fondo informativo |
| `--color-border` | `#D3D1C7` (gray-200) | Bordes neutros |
| `--color-border-focus` | `#5DCAA5` (sage-400) | Borde en estado focus |
| `--color-border-error` | `#F09595` (coral-400) | Borde en estado error |

**Tokens de rol de usuario:**

| Token | Valor resuelto | Uso |
|-------|---------------|-----|
| `--color-role-admin` | `#534AB7` (purple-600) | Texto badge Admin |
| `--color-role-admin-bg` | `#EEEDFE` (purple-50) | Fondo badge Admin |
| `--color-role-admin-border` | `#534AB7` (purple-600) | Borde/ícono Admin |
| `--color-role-researcher` | `#1D9E75` (sage-500) | Texto badge Investigador |
| `--color-role-researcher-bg` | `#E1F5EE` (sage-50) | Fondo badge Investigador |
| `--color-role-researcher-border` | `#0F6E56` (sage-600) | Borde Investigador |
| `--color-role-aplicador` | `#BA7517` (amber-500) | Texto badge Prof. Aplicador |
| `--color-role-aplicador-bg` | `#FAEEDA` (amber-50) | Fondo badge Prof. Aplicador |
| `--color-role-aplicador-border` | `#854F0B` (amber-600) | Borde Prof. Aplicador |

```css
/* Correcto — usar token */
color: var(--color-text-primary);
background-color: var(--color-primary);

/* Incorrecto — valor hardcodeado */
color: #2C2C2A;
background-color: #5DCAA5;
```

### Escala tipográfica

| Token | Tamaño | Caso de uso |
|-------|--------|-------------|
| `--font-size-display` | `1.75rem` (28px) | Bienvenida, pantalla de login |
| `--font-size-h1` | `1.375rem` (22px) | Título de sección principal |
| `--font-size-h2` | `1.125rem` (18px) | Subtítulo de módulo |
| `--font-size-h3` | `1rem` (16px) | Encabezado de card, grupo |
| `--font-size-body` | `1rem` (16px) | Texto de contenido principal |
| `--font-size-small` | `0.875rem` (14px) | Texto secundario, descripciones |
| `--font-size-caption` | `0.8125rem` (13px) | Timestamps, metadata, notas |
| `--font-size-label` | `0.6875rem` (11px) | Etiqueta de campo, header de tabla |
| `--font-size-code` | `0.8125rem` (13px) | Tokens técnicos, endpoints |

**Pesos:** Solo dos — `--font-weight-regular: 400` y `--font-weight-medium: 500`. Sin bold (700).

**Interlineado:**

| Token | Valor | Uso |
|-------|-------|-----|
| `--line-height-tight` | `1.2` | Headings, labels, botones |
| `--line-height-normal` | `1.5` | Body, caption — texto de lectura |
| `--line-height-button` | `1` | Dentro de botones |

### Escala de espaciado

| Token | Valor | px | Uso |
|-------|-------|----|-----|
| `--space-0-5` | `0.125rem` | 2px | Micro gap, separador mínimo |
| `--space-1` | `0.25rem` | 4px | Gap mínimo ícono + texto inline |
| `--space-2` | `0.5rem` | 8px | Gap interno de componentes, badges |
| `--space-3` | `0.75rem` | 12px | Separación entre elementos relacionados |
| `--space-4` | `1rem` | 16px | Padding de sección, separación entre campos |
| `--space-5` | `1.25rem` | 20px | Padding interno de cards |
| `--space-6` | `1.5rem` | 24px | Padding de contenedores principales |
| `--space-8` | `2rem` | 32px | Separación entre secciones distintas |
| `--space-12` | `3rem` | 48px | Separación entre bloques de página |
| `--space-16` | `4rem` | 64px | Márgenes de página en pantallas grandes |

**Tokens de layout:**

| Token | Valor | Descripción |
|-------|-------|-------------|
| `--sidebar-width` | `240px` | Ancho de sidebar de navegación |
| `--topbar-height` | `64px` | Alto de barra superior |
| `--content-max-width` | `1400px` | Ancho máximo del área de contenido |
| `--input-height` | `40px` | Alto de inputs |
| `--button-height` | `36px` | Alto de botón md |
| `--button-height-sm` | `28px` | Alto de botón sm |
| `--button-height-lg` | `44px` | Alto de botón lg |
| `--modal-max-width` | `560px` | Ancho máximo de modal md |
| `--login-card-width` | `420px` | Ancho de card de login |
| `--form-col-width` | `480px` | Ancho de columna de formulario |

### Sombras y radios

**Radios:**

| Token | Valor | Uso |
| ------- | ------- | ----- |
| `--radius-sm` | `4px` | Tags inline, checkboxes, chips pequeños |
| `--radius-md` | `8px` | Inputs, botones, cards pequeñas (más frecuente) |
| `--radius-lg` | `12px` | Cards principales, modales, panels |
| `--radius-pill` | `999px` | Badges de rol, tags de estado |

**Sombras** (definidas también en `tailwind.config.js`):

| Token Tailwind | Valor | Uso |
| --------------- | ------- | ----- |
| `shadow-sm` | `0 1px 2px rgba(44,44,42,0.06), 0 1px 3px rgba(44,44,42,0.10)` | Cards, elementos elevados leves |
| `shadow-md` | `0 4px 6px rgba(44,44,42,0.07), 0 2px 4px rgba(44,44,42,0.06)` | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px rgba(44,44,42,0.08), 0 4px 6px rgba(44,44,42,0.05)` | Modales, sidesheets |
| `shadow-focus` | `0 0 0 3px rgba(93,202,165,0.2)` | Anillo de focus accesible |

### Regla de oro

> Si el valor existe como token en `src/styles/tokens/`, **siempre usar el token**.
> Nunca hardcodear colores, tamaños de fuente, espaciado o sombras.

---

## 8. Componentes disponibles

Todos los componentes se importan desde el barrel:

```jsx
import { Button, FormField, Modal, DataTable } from '@/components/app'
// o con ruta relativa desde pages/:
import { Button, FormField } from '../components/app'
```

La documentación completa de cada componente (props, variantes, ejemplos de uso) está en **[`COMPONENTS.md`](../COMPONENTS.md)** en la raíz del repositorio.

Componentes disponibles: `Button`, `FormField`, `Modal`, `DataTable`, `RoleBadge`, `StatusBadge`, `Alert`, `Toast` + `useToast`, `Sidebar`, `EmptyState`, `Spinner`, `Typography`, `SkeletonRow`.

---

## 9. Convenciones de desarrollo

### Naming

| Elemento | Convención | Ejemplo |
| ---------- | ----------- | --------- |
| Componentes | PascalCase | `UserProfileCard.jsx` |
| Hooks | camelCase, prefijo `use` | `useUserData.js` |
| Páginas | PascalCase + sufijo `Page` | `UserListPage.jsx` |
| Utilidades | camelCase | `formatDate.js` |
| CSS classes (DS) | kebab-case | `.user-card`, `.btn-primary` |
| Variables CSS | kebab-case con prefijo | `--color-primary`, `--space-4` |

### Estructura de un componente

```jsx
// NombreComponente.jsx
import { useState } from 'react'
import { IconName } from 'lucide-react'           // íconos
import { OtroComponente } from '@/components/app'  // componentes DS

function NombreComponente({ prop1, prop2 = 'default' }) {
  // lógica

  return (
    <div style={{ gap: 'var(--space-4)' }}>
      ...
    </div>
  )
}

export default NombreComponente
```

### Clases CSS dinámicas — CRÍTICO para Tailwind JIT

Tailwind v3 JIT **purga las clases que no aparecen como strings completos** en el código.

```jsx
// INCORRECTO — Tailwind no detecta estas clases, serán purgadas
const cls = `btn-${variant}`        // btn-primary, btn-secondary → MISSING
const cls = `text-${color}-500`     // text-red-500 → MISSING

// CORRECTO — usar lookup object con strings completos
const variantClass = {
  primary:   'btn-primary',    // string completo, Tailwind lo detecta
  secondary: 'btn-secondary',
  ghost:     'btn-ghost',
}
const cls = variantClass[variant]
```

Si tienes clases que no pueden aparecer estáticamente, añadir el patrón al `safelist` en `tailwind.config.js`. El safelist ya incluye:

```js
{ pattern: /^btn-/ }
{ pattern: /^badge-role-/ }
{ pattern: /^badge-status-/ }
{ pattern: /^toast-/ }
{ pattern: /^animate-/ }
```

### Imports

```jsx
// Siempre usar el barrel y el alias @/
import { Button, Modal } from '@/components/app'

// Nunca ruta directa a un componente individual
import Button from '@/components/app/Button'
import Button from '../../../components/app/Button'
```

### Cuándo crear en `components/app/` vs. en el módulo

| Tipo de componente | Dónde va |
| ------------------- | ---------- |
| Reutilizable en 2+ páginas | `src/components/app/` + registrar en `index.js` |
| Específico de una sola página | Archivo de la página o sub-carpeta junto a ella |
| Primitivo Radix/shadcn | `src/components/ui/` (no crear manualmente) |

### Añadir un componente nuevo al barrel

```js
// src/components/app/index.js — añadir al final:
export { default as NuevoComponente } from './NuevoComponente'
```

---

## 10. Cómo desarrollar un nuevo módulo

### Paso 1 — Crear la página

```jsx
// src/pages/NombrePage.jsx
import { Button, DataTable } from '@/components/app'

function NombrePage() {
  return (
    <main style={{ padding: 'var(--space-6)' }}>
      <h1 style={{ fontSize: 'var(--font-size-h1)', fontWeight: 'var(--font-weight-medium)' }}>
        Título del módulo
      </h1>
      {/* contenido */}
    </main>
  )
}

export default NombrePage
```

### Paso 2 — Registrar la ruta

```jsx
// src/App.jsx — añadir dentro de <Routes>
import NombrePage from './pages/NombrePage'

<Route path="/nombre" element={<NombrePage />} />
```

### Paso 3 — Verificar

```bash
npm run dev    # arrancar y navegar a /nombre
npm run build  # verificar que compila sin errores
npm run lint   # verificar que no hay errores de linting
```

---

## 11. Documentos de referencia

| Documento | Ubicación | Descripción |
| ----------- | ----------- | ------------- |
| Design System | [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Especificación completa: tokens, paleta, tipografía, principios, componentes |
| Componentes | [COMPONENTS.md](docs/COMPONENTS.md) | Catálogo completo de componentes DS con props, variantes y ejemplos |
| Tokens — colores | [colors.ccs](src/styles/tokens/colors.css) | CSS custom properties de la paleta completa |
| Tokens — tipografía | [typography.css](src/styles/tokens/typography.css) | CSS custom properties de escala tipográfica |
| Tokens — espaciado | [spacing.css](src/styles/tokens/spacing.css) | CSS custom properties de espaciado, radios y layout |

---

_Última actualización: 2026-03-22_
_Mantener actualizado al introducir nuevos componentes, dependencias o convenciones._
