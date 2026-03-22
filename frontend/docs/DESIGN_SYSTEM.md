# Sistema de Perfiles Lingüísticos — Design System

> **Basado en:** DSFDR v1.0 — Design System & Frontend Design Reference (Marzo 2026)
> **Generado:** 2026-03-22 | **Estado del DSFDR fuente:** En revisión — pendiente de aprobación
> **Stack:** React 18 + Vite 5 + Tailwind CSS 3 + shadcn/ui | **Lenguaje:** JavaScript ES2022

---

## Tabla de contenido

1. [Principios de Diseño](#1-principios-de-diseño)
2. [Tokens de Diseño](#2-tokens-de-diseño)
   - [2.1 Colores](#21-colores)
   - [2.2 Tipografía](#22-tipografía)
   - [2.3 Espaciado](#23-espaciado)
   - [2.4 Sombras y Elevación](#24-sombras-y-elevación)
   - [2.5 Bordes y Radios](#25-bordes-y-radios)
3. [Componentes](#3-componentes)
4. [Patrones de Layout](#4-patrones-de-layout)
5. [Guía de Implementación](#5-guía-de-implementación)
6. [Plan de Acción](#6-plan-de-acción)

---

## 1. Principios de Diseño

### 1.1 Identidad del Sistema

El sistema adopta la personalidad de un asistente cálido y profesional diseñado para
investigadores y profesionales académicos. Combina la precisión de un investigador con la
accesibilidad de un colega de confianza. Esta personalidad no es solo tonal — guía cada
decisión visual, desde el color elegido hasta el copy de un mensaje de error.

### 1.2 Valores de Personalidad

| Rasgo | Definición | Aplicación directa en UI |
|---|---|---|
| **Confiable** | El sistema cumple lo que promete sin comportamientos inesperados | Estados claros, feedback inmediato, sin sorpresas de interacción |
| **Paciente** | El ritmo lo marca quien usa el sistema, no la interfaz | Carga progresiva, sin timeouts agresivos, mensajes orientadores |
| **Cálido** | Reconoce que hay personas detrás de cada sesión | Mensajes en primera persona, errores sin culpa, microcopy humano |
| **Seguro** | La seguridad no se siente como barrera, sino como protección | Feedback de validación oportuno, sin exposición de datos técnicos |
| **Preciso** | Cada elemento tiene una función. Sin decoración sin propósito | Layouts limpios, jerarquía clara, sin elementos redundantes |
| **Humano** | Las personas son el centro, la tecnología el medio | Onboarding orientador, empty states con guía, no solo error codes |

### 1.3 Estilo Visual

- **Tono:** Minimalista académico cálido. Fondos arena, no blancos puros ni grises fríos.
- **Color:** Cuatro acentos con roles semánticos fijos. Un color nunca se usa por estética — comunica estado o categoría.
- **Tipografía:** Máximo dos pesos (regular y medium). Sin negrita en interfaces de datos.
- **Iconografía:** Outline por defecto. Llenos solo para íconos de rol.
- **Espaciado:** Base 4px. Todo valor debe ser un token — sin valores arbitrarios.
- **Movimiento:** Funcional. Si quitar la animación no hace al sistema menos comprensible, no va.

---

## 2. Tokens de Diseño

### 2.1 Colores

#### 2.1.1 Colores Primarios de Acento

Cuatro colores base con roles semánticos permanentes. **Nunca** intercambiar roles por razones estéticas.

| Nombre | Hex 400 | Rol semántico |
|---|---|---|
| **Verde Salvia** | `#5DCAA5` | Acento primario · CTA · Éxito · Estado activo |
| **Lila Académico** | `#7F77DD` | Roles · Estado de énfasis · Identidad de rol Admin |
| **Ámbar Cálido** | `#EF9F27` | Advertencias · Atención · Rol Prof. Aplicador |
| **Coral Suave** | `#F09595` | Errores · Estado inactivo/deshabilitado |

Colores de apoyo:

| Nombre | Hex 400 | Rol semántico |
|---|---|---|
| **Azul Info** | `#378ADD` | Información neutral · Tooltips · Banners |
| **Verde Éxito** | `#639922` | Confirmación de operaciones de alto impacto |

#### 2.1.2 Escalas Completas por Color

**Verde Salvia (Teal)**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#E1F5EE`  | Fondo de estado éxito, badge Investigador |
| 100 | `#C5EBE0` | Hover suave de elementos success |
| 200 | `#9DDFC8` | Fill de selección suave |
| 300 | `#78D4B3` | Elementos activos secundarios |
| 400 | `#5DCAA5` | **Acento principal · CTA · botón primario** |
| 500 | `#1D9E75` | Rol Investigador (badge text) |
| 600 | `#0F6E56` | Bordes de énfasis · texto sobre fondo 50 |
| 700 | `#0B5A47` | Texto en contextos de alto contraste |
| 800 | `#085041` | Texto principal sobre ramp verde |
| 900 | `#053630` | Texto máximo contraste sobre verde |

**Lila Académico (Purple)**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#EEEDFE` | Fondo badge Admin · estado activo Lila |
| 100 | `#DDDCFC` | Hover suave elementos Admin |
| 200 | `#C8C5F9` | Fill selección Admin |
| 300 | `#ADA8EF` | Elementos activos secundarios |
| 400 | `#7F77DD` | **Acento Lila · rol Admin** |
| 500 | `#6860CE` | Énfasis medio |
| 600 | `#534AB7` | Borde Admin · ícono Admin |
| 700 | `#473EA0` | Texto medio contraste |
| 800 | `#3C3489` | Texto sobre fondo Lila |
| 900 | `#2A2465` | Texto máximo contraste sobre Lila |

**Ámbar Cálido (Amber)**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#FAEEDA` | Fondo badge Prof. Aplicador · advertencia |
| 100 | `#F5DFB5` | Hover suave advertencia |
| 200 | `#EDD090` | Fill warning suave |
| 300 | `#E8BE68` | Elementos de atención media |
| 400 | `#EF9F27` | **Advertencia · atención · rol Prof. Aplicador** |
| 500 | `#BA7517` | Rol Prof. Aplicador (badge text) |
| 600 | `#854F0B` | Borde advertencia · ícono Prof. Aplicador |
| 700 | `#6E420A` | Texto advertencia medio |
| 800 | `#633806` | Texto sobre fondo Ámbar |
| 900 | `#4A2804` | Texto máximo contraste |

**Coral Suave (Error/Inactive)**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#FCEBEB` | Fondo de error · fondo estado inactivo |
| 100 | `#F9D7D7` | Hover error suave |
| 200 | `#F4BABA` | Fill error medio |
| 300 | `#F2A8A8` | Elementos de error secundarios |
| 400 | `#F09595` | **Error · estado inactivo** |
| 500 | `#D06060` | Error medio |
| 600 | `#A32D2D` | Borde error · texto error |
| 700 | `#8A2424` | Texto error medio |
| 800 | `#791F1F` | Texto error sobre fondo claro |
| 900 | `#5C1414` | Texto máximo contraste error |

**Azul Info**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#E6F1FB` | Fondo tooltip · banner info |
| 400 | `#378ADD` | Acento informativo |
| 600 | `#185FA5` | Borde info |
| 800 | `#0C447C` | Texto sobre fondo info |

**Verde Éxito**

| Stop | Hex | Uso |
|---|---|---|
| 50 | `#EAF3DE` | Fondo confirmación |
| 400 | `#639922` | Acento éxito operaciones |
| 600 | `#3B6D11` | Borde éxito |
| 800 | `#27500A` | Texto sobre fondo éxito |

#### 2.1.3 Escala de Grises Cálidos

Base de toda la estructura visual neutral. Tono arena, no fríos.

| Stop | Hex | Uso semántico |
|---|---|---|
| 50 | `#F1EFE8` | Fondo de página · fondo neutral de sección |
| 100 | `#E8E6DF` | Hover de filas de tabla · fondo de código |
| 200 | `#D3D1C7` | Bordes ligeros · separadores |
| 300 | `#BFBDB5` | Placeholder · bordes de baja jerarquía |
| 400 | `#888780` | Texto terciario · metadatos |
| 500 | `#706F69` | Texto deshabilitado visible |
| 600 | `#5F5E5A` | Texto secundario |
| 700 | `#4A4A46` | Texto secundario de alto contraste |
| 800 | `#3D3C38` | Texto de énfasis sin ser primario |
| 900 | `#2C2C2A` | Texto principal |

**Color especial:**

- `#B4B2A9` — Placeholder en inputs (entre Gray 300 y 400)
- `#04342C` — Texto sobre botón primario verde (contraste 6.2:1 ✓ AA)
- `#FFFFFF` — Background de inputs y cards

#### 2.1.4 Tokens Semánticos de Color

Mapeados a los ramps anteriores para uso en código. Estos son los tokens que el código debe consumir — no los hex directos.

```css
/* Acciones y primario */
--color-primary:          #5DCAA5;  /* Verde Salvia 400 */
--color-primary-hover:    #3EB88C;  /* Verde Salvia ~500 */
--color-primary-dark:     #0F6E56;  /* Verde Salvia 600 */
--color-primary-light:    #E1F5EE;  /* Verde Salvia 50 */
--color-primary-text:     #04342C;  /* Texto sobre botón primario */

/* Roles de usuario */
--color-role-admin:       #7F77DD;  /* Lila 400 */
--color-role-admin-bg:    #EEEDFE;  /* Lila 50 */
--color-role-admin-border:#534AB7;  /* Lila 600 */
--color-role-researcher:  #1D9E75;  /* Verde 500 */
--color-role-researcher-bg:#E1F5EE; /* Verde 50 */
--color-role-aplicador:   #BA7517;  /* Ámbar 500 */
--color-role-aplicador-bg:#FAEEDA;  /* Ámbar 50 */

/* Estados */
--color-error:            #F09595;  /* Coral 400 */
--color-error-text:       #A32D2D;  /* Coral 600 */
--color-error-bg:         #FCEBEB;  /* Coral 50 */
--color-warning:          #EF9F27;  /* Ámbar 400 */
--color-warning-text:     #854F0B;  /* Ámbar 600 */
--color-warning-bg:       #FAEEDA;  /* Ámbar 50 */
--color-success:          #5DCAA5;  /* Verde 400 */
--color-success-text:     #0F6E56;  /* Verde 600 */
--color-success-bg:       #E1F5EE;  /* Verde 50 */
--color-info:             #378ADD;  /* Azul 400 */
--color-info-text:        #185FA5;  /* Azul 600 */
--color-info-bg:          #E6F1FB;  /* Azul 50 */

/* Texto */
--color-text-primary:     #2C2C2A;  /* Gray 900 */
--color-text-secondary:   #5F5E5A;  /* Gray 600 */
--color-text-tertiary:    #888780;  /* Gray 400 */
--color-text-placeholder: #B4B2A9;  /* Gray ~300-400 */
--color-text-disabled:    #888780;  /* Gray 400 */

/* Superficies */
--color-surface:          #FFFFFF;  /* Cards, inputs */
--color-surface-raised:   #FFFFFF;  /* Modales */
--color-bg-page:          #F1EFE8;  /* Gray 50 — fondo de página */
--color-bg-subtle:        #E8E6DF;  /* Gray 100 — hover de filas */

/* Bordes */
--color-border:           #D3D1C7;  /* Gray 200 */
--color-border-focus:     #5DCAA5;  /* Verde 400 */
--color-border-error:     #F09595;  /* Coral 400 */
```

#### 2.1.5 Reglas de Uso Semántico

> **Regla crítica:** Nunca usar un color de acento por razones estéticas. Verde = éxito/primario, Lila = rol/identidad, Ámbar = precaución, Coral = error.

| Escenario | Color | Token |
|---|---|---|
| Acción principal (CTA) | Verde Salvia | `--color-primary` |
| Rol Administrador | Lila Académico | `--color-role-admin` / `--color-role-admin-bg` |
| Rol Investigador | Verde Salvia suave | `--color-role-researcher` / `--color-role-researcher-bg` |
| Rol Prof. Aplicador | Ámbar Cálido suave | `--color-role-aplicador` / `--color-role-aplicador-bg` |
| Error de validación | Coral Suave | `--color-error` / `--color-error-bg` |
| Advertencia / aviso | Ámbar Cálido | `--color-warning` / `--color-warning-bg` |
| Éxito / confirmación | Verde Salvia | `--color-success` / `--color-success-bg` |
| Información neutral | Azul Info | `--color-info` / `--color-info-bg` |
| Usuario inactivo | Coral + opacidad | `--color-error-bg` + `opacity: 0.5` |
| Texto principal | Gray 900 | `--color-text-primary` |
| Texto secundario | Gray 600 | `--color-text-secondary` |
| Fondo de página | Gray 50 arena | `--color-bg-page` |

#### 2.1.6 Ratios de Contraste WCAG 2.1

| Combinación | Ratio | Nivel | Estado |
|---|---|---|---|
| `#2C2C2A` sobre `#FFFFFF` | 16.8:1 | AAA | Pasa |
| `#5F5E5A` sobre `#FFFFFF` | 7.4:1 | AA | Pasa |
| `#0F6E56` sobre `#E1F5EE` | 5.1:1 | AA | Pasa |
| `#534AB7` sobre `#EEEDFE` | 4.8:1 | AA | Pasa |
| `#04342C` sobre `#5DCAA5` | 6.2:1 | AA | Pasa — usar para texto en botón primario |
| `#FFFFFF` sobre `#5DCAA5` | 2.8:1 | Falla AA | **No usar** texto blanco sobre Verde 400 |
| `#A32D2D` sobre `#FCEBEB` | 5.4:1 | AA | Pasa |
| `#854F0B` sobre `#FAEEDA` | 4.6:1 | AA | Pasa |

---

### 2.2 Tipografía

#### 2.2.1 Familias Tipográficas

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

Carga recomendada: `@fontsource/inter` via npm (solo pesos 400 y 500 para optimizar bundle).

```bash
npm install @fontsource/inter
# En src/index.css o main.jsx:
# import '@fontsource/inter/400.css'
# import '@fontsource/inter/500.css'
```

#### 2.2.2 Escala Tipográfica Completa

| Nivel | Token | Size | Weight | Line-height | Letter-spacing | Uso |
|---|---|---|---|---|---|---|
| **Display** | `--font-size-display` | 28px | 500 | 1.2 | normal | Títulos de bienvenida, pantalla de login |
| **Heading 1** | `--font-size-h1` | 22px | 500 | 1.2 | normal | Títulos de sección principal |
| **Heading 2** | `--font-size-h2` | 18px | 500 | 1.2 | normal | Subtítulos de módulo |
| **Heading 3** | `--font-size-h3` | 16px | 500 | 1.2 | normal | Encabezados de card, etiquetas de grupo |
| **Body Regular** | `--font-size-body` | 16px | 400 | 1.5 | normal | Texto de contenido principal |
| **Body Small** | `--font-size-small` | 14px | 400 | 1.5 | normal | Texto secundario, descripciones |
| **Caption** | `--font-size-caption` | 13px | 400 | 1.5 | normal | Timestamps, metadata, notas |
| **Label** | `--font-size-label` | 11px | 500 | 1.2 | 0.07em | Etiquetas de campo, headers de tabla (UPPERCASE) |
| **Code** | `--font-size-code` | 13px | 400 | 1.5 | normal | Tokens técnicos, endpoints, valores mono |

#### 2.2.3 CSS de Tipografía

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-display: 1.75rem;   /* 28px */
  --font-size-h1:      1.375rem;  /* 22px */
  --font-size-h2:      1.125rem;  /* 18px */
  --font-size-h3:      1rem;      /* 16px */
  --font-size-body:    1rem;      /* 16px */
  --font-size-small:   0.875rem;  /* 14px */
  --font-size-caption: 0.8125rem; /* 13px */
  --font-size-label:   0.6875rem; /* 11px */
  --font-size-code:    0.8125rem; /* 13px */

  --font-weight-regular: 400;
  --font-weight-medium:  500;

  --line-height-tight:  1.2; /* headings, labels, botones */
  --line-height-normal: 1.5; /* body, caption */
  --line-height-button: 1;   /* botones */

  --letter-spacing-label: 0.07em;
  --letter-spacing-normal: normal;
}
```

#### 2.2.4 Reglas Tipográficas

- Máximo dos pesos: 400 regular y 500 medium. **Sin bold (700)** en interfaces de datos.
- Nunca truncar texto con `ellipsis` sin tooltip que muestre el valor completo.
- Números en tablas: `font-family: var(--font-mono)`, `text-align: right`.
- Longitud máxima de línea de lectura: 65–75 caracteres (~600px). Usar `max-width: 65ch` en párrafos.
- Labels siempre encima del campo — nunca solo como placeholder.
- Labels de tabla y campo: `text-transform: uppercase; letter-spacing: 0.07em;`

---

### 2.3 Espaciado

Sistema de base 4px. **Toda medida debe usar un token — sin valores arbitrarios.**

#### 2.3.1 Tokens de Espaciado

```css
:root {
  --space-1:  0.25rem;  /*  4px — gap mínimo ícono+texto */
  --space-2:  0.5rem;   /*  8px — gap interno de componentes */
  --space-3:  0.75rem;  /* 12px — separación entre elementos relacionados */
  --space-4:  1rem;     /* 16px — padding de sección, separación entre campos */
  --space-5:  1.25rem;  /* 20px — padding interno de cards */
  --space-6:  1.5rem;   /* 24px — padding de contenedores principales */
  --space-8:  2rem;     /* 32px — separación entre secciones distintas */
  --space-12: 3rem;     /* 48px — separación entre bloques de página */
  --space-16: 4rem;     /* 64px — márgenes de página en pantallas grandes */
}
```

#### 2.3.2 Tabla de Referencia

| Token | px | rem | Cuándo usarlo |
|---|---|---|---|
| `--space-1` | 4px | 0.25rem | Gap mínimo entre ícono y texto inline |
| `--space-2` | 8px | 0.5rem | Padding interno de badges, gap en botones |
| `--space-3` | 12px | 0.75rem | Separación entre elementos relacionados en un grupo |
| `--space-4` | 16px | 1rem | Padding de sección · separación entre campos de form |
| `--space-5` | 20px | 1.25rem | Padding interno de cards |
| `--space-6` | 24px | 1.5rem | Padding de contenedores y paneles principales |
| `--space-8` | 32px | 2rem | Separación entre secciones distintas |
| `--space-12` | 48px | 3rem | Separación entre bloques de página |
| `--space-16` | 64px | 4rem | Márgenes laterales en pantallas grandes (≥1280px) |

---

### 2.4 Sombras y Elevación

El sistema usa sombras funcionales — indican elevación real (modal sobre overlay, card sobre fondo), no decoración.

```css
:root {
  /* Focus ring — presente en TODOS los elementos interactivos */
  --shadow-focus: 0 0 0 3px rgba(93, 202, 165, 0.2);

  /* Elevación de superficie (cards sobre fondo) */
  --shadow-sm: 0 1px 2px rgba(44, 44, 42, 0.06),
               0 1px 3px rgba(44, 44, 42, 0.10);

  /* Elevación media (dropdowns, popovers) */
  --shadow-md: 0 4px 6px rgba(44, 44, 42, 0.07),
               0 2px 4px rgba(44, 44, 42, 0.06);

  /* Elevación alta (modales, sidebars) */
  --shadow-lg: 0 10px 15px rgba(44, 44, 42, 0.08),
               0 4px 6px rgba(44, 44, 42, 0.05);

  /* Overlay de modal */
  --overlay-bg: rgba(44, 44, 42, 0.5);
}
```

**Reglas:**

- Cards sobre fondo de página: `--shadow-sm`
- Dropdowns, tooltips, popovers: `--shadow-md`
- Modales y drawers: `--shadow-lg`
- Focus ring: `--shadow-focus` — siempre en verde teal, nunca en otro color
- Inputs en estado error no tienen sombra extra, solo borde coral

---

### 2.5 Bordes y Radios

```css
:root {
  --radius-sm:   4px;    /* Tags inline, checkboxes */
  --radius-md:   8px;    /* Inputs, botones, cards pequeñas */
  --radius-lg:   12px;   /* Cards principales, modales */
  --radius-pill: 999px;  /* Badges de rol, tags */

  --border-width-default: 0.5px;  /* Bordes de inputs en default */
  --border-width-focus:   1px;    /* Bordes en focus/error/success */
  --border-width-emphasis:1px;    /* Bordes de cards y secciones */
}
```

---

## 3. Componentes

### 3.1 Button

El sistema tiene 5 variantes funcionales + estado disabled. **Una sola acción primaria por vista.**

#### Variantes

| Variante | Uso | BG | Color texto | Border | Hover |
|---|---|---|---|---|---|
| **Primary** | Acción principal de pantalla (1 por vista) | `#5DCAA5` | `#04342C` | ninguno | `opacity: 0.88` |
| **Secondary** | Acción secundaria o alternativa | `transparent` | `#0F6E56` | `1px #5DCAA5` | BG `#E1F5EE` |
| **Ghost** | Cancelar, acción terciaria | `transparent` | `#5F5E5A` | `1px #D3D1C7` | BG `#F1EFE8` |
| **Danger** | Acciones destructivas (desactivar, eliminar) | `transparent` | `#A32D2D` | `1px #F09595` | BG `#FCEBEB` |
| **Icon-only** | Acciones en tabla o espacio reducido | `transparent` | `currentColor` | ninguno | BG `#F1EFE8` · `radius: 8px` |
| **Disabled** | Cualquier variante no disponible | igual variante | — | — | `opacity: 0.4; cursor: not-allowed` |

#### Especificación de dimensiones

```css
.btn {
  height: 36px;
  padding: 0 var(--space-4);   /* 0 16px */
  border-radius: var(--radius-md);
  font-size: var(--font-size-small); /* 14px */
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-button);
  transition: background-color var(--duration-fast) var(--ease-default),
              opacity var(--duration-fast) var(--ease-default);
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.btn:active {
  transform: scale(0.98);
  transition: transform var(--duration-fast) var(--ease-default);
}
```

#### Snippet JSX

```jsx
// Button.jsx — variantes primarias
function Button({ variant = 'primary', disabled, loading, children, ...props }) {
  const variants = {
    primary:   'bg-[#5DCAA5] text-[#04342C] hover:opacity-[0.88]',
    secondary: 'border border-[#5DCAA5] text-[#0F6E56] hover:bg-[#E1F5EE]',
    ghost:     'border border-[#D3D1C7] text-[#5F5E5A] hover:bg-[#F1EFE8]',
    danger:    'border border-[#F09595] text-[#A32D2D] hover:bg-[#FCEBEB]',
  }

  return (
    <button
      className={`
        inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium
        transition-all duration-100 active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed
        focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(93,202,165,0.2)]
        ${variants[variant]}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
```

**Cuándo usar cada variante:**

- `primary` — "Guardar", "Iniciar sesión", "Crear usuario". Una por pantalla.
- `secondary` — "Ver detalles", "Exportar". Alternativa a la acción principal.
- `ghost` — "Cancelar", "Volver". Siempre acompañando a primary o secondary.
- `danger` — "Desactivar cuenta", "Eliminar instrumento". Siempre en confirmación modal.
- `icon-only` — Acciones inline en tablas (editar, desactivar). Con `aria-label` obligatorio.

---

### 3.2 Input / Campo de Formulario

#### Especificación

| Propiedad | Valor |
|---|---|
| Altura | 40px |
| Padding horizontal | 12px (`var(--space-3)`) |
| Border default | `0.5px solid #D3D1C7` |
| Border focus | `1px solid #5DCAA5` + ring `var(--shadow-focus)` |
| Border error | `1px solid #F09595` |
| Background | `#FFFFFF` — siempre. Sin backgrounds de color. |
| Border radius | 8px (`var(--radius-md)`) |
| Placeholder | 14px · `#B4B2A9` — solo hint, nunca reemplaza label |
| Label | Encima del campo · 11px 500 uppercase · `#5F5E5A` |
| Helper text | Debajo del campo · 12px 400 · `#888780` |
| Error message | 12px 400 · `#A32D2D` · ícono `alert-circle` · `aria-describedby` |

#### Estados visuales

```
Default  → border: 0.5px solid #D3D1C7
Hover    → border: 1px solid #5DCAA5 (sutil, sin ring)
Focus    → border: 1px solid #5DCAA5 + box-shadow: 0 0 0 3px rgba(93,202,165,0.2)
Error    → border: 1px solid #F09595 + mensaje error debajo
Success  → border: 1px solid #5DCAA5 + BG: #E1F5EE (solo en validación inline)
Disabled → opacity: 0.4 + cursor: not-allowed + bg: #F1EFE8
```

#### Snippet JSX

```jsx
// FormField.jsx — campo completo con label y manejo de error
function FormField({ id, label, error, helper, required, ...inputProps }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-medium uppercase tracking-[0.07em] text-[#5F5E5A]"
      >
        {label}
        {required && <span className="text-[#F09595] ml-1" aria-hidden>*</span>}
      </label>

      <input
        id={id}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        aria-invalid={!!error}
        className={`
          h-10 px-3 rounded-lg bg-white text-sm text-[#2C2C2A]
          placeholder:text-[#B4B2A9]
          transition-shadow duration-100
          focus:outline-none focus:ring-[3px] focus:ring-[rgba(93,202,165,0.2)]
          disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[#F1EFE8]
          ${error
            ? 'border border-[#F09595]'
            : 'border-[0.5px] border-[#D3D1C7] focus:border focus:border-[#5DCAA5]'
          }
        `}
        {...inputProps}
      />

      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs text-[#A32D2D]">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
      {!error && helper && (
        <p id={`${id}-helper`} className="text-xs text-[#888780]">{helper}</p>
      )}
    </div>
  )
}
```

---

### 3.3 Badge de Rol

Los badges de rol son las únicas representaciones válidas de los roles del sistema. **No crear variantes.**

| Rol | Texto | Color texto | Background | Ícono | Ícono color |
|---|---|---|---|---|---|
| Administrador | "Administrador" | `#534AB7` | `#EEEDFE` | `crown` | `#534AB7` |
| Investigador | "Investigador" | `#0F6E56` | `#E1F5EE` | `search` | `#0F6E56` |
| Prof. Aplicador | "Prof. Aplicador" | `#854F0B` | `#FAEEDA` | `clipboard-list` | `#854F0B` |

#### Snippet JSX

```jsx
// RoleBadge.jsx
const ROLE_CONFIG = {
  admin: {
    label: 'Administrador',
    textColor: '#534AB7',
    bgColor: '#EEEDFE',
    Icon: Crown,
  },
  researcher: {
    label: 'Investigador',
    textColor: '#0F6E56',
    bgColor: '#E1F5EE',
    Icon: Search,
  },
  aplicador: {
    label: 'Prof. Aplicador',
    textColor: '#854F0B',
    bgColor: '#FAEEDA',
    Icon: ClipboardList,
  },
}

function RoleBadge({ role }) {
  const config = ROLE_CONFIG[role]
  if (!config) return null

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ color: config.textColor, backgroundColor: config.bgColor }}
    >
      <config.Icon size={12} aria-hidden />
      {config.label}
    </span>
  )
}
```

#### Badge de Estado

```jsx
// StatusBadge.jsx
const STATUS_CONFIG = {
  active:   { label: 'Activo',    color: '#0F6E56', bg: '#E1F5EE', Icon: CheckCircle },
  inactive: { label: 'Inactivo',  color: '#A32D2D', bg: '#FCEBEB', Icon: XCircle },
  pending:  { label: 'Pendiente', color: '#854F0B', bg: '#FAEEDA', Icon: Clock },
}
```

---

### 3.4 Card

Contenedor de superficie para agrupar contenido relacionado.

```css
.card {
  background: #FFFFFF;
  border: 1px solid #D3D1C7;    /* --color-border */
  border-radius: 12px;           /* --radius-lg */
  box-shadow: var(--shadow-sm);
  padding: var(--space-5);       /* 20px */
}

.card-header {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid #D3D1C7;
  margin-bottom: var(--space-4);
}
```

```jsx
// Card.jsx
function Card({ title, action, children, className }) {
  return (
    <div className={`bg-white border border-[#D3D1C7] rounded-xl p-5 shadow-sm ${className}`}>
      {title && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#D3D1C7]">
          <h3 className="text-base font-medium text-[#2C2C2A]">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
```

---

### 3.5 Table

Tabla de datos con soporte para estados vacíos y filas de usuario desactivado.

#### Especificación

| Elemento | Valor |
|---|---|
| Header | Background `#F1EFE8` · Label 11px 500 uppercase · color `#5F5E5A` |
| Row default | Background `#FFFFFF` · border-bottom `1px solid #D3D1C7` |
| Row hover | Background `#E8E6DF` · transición 100ms |
| Row inactive | Background `#FCEBEB` · opacity `0.7` |
| Cell texto | Body-small 14px 400 · `#2C2C2A` |
| Cell metadata | Caption 13px · `#888780` |
| Cell numérico | Font mono · text-right |
| Padding celda | `12px 16px` (vertical horizontal) |

```jsx
// DataTable.jsx — estructura base
function DataTable({ columns, data, emptyMessage = 'No hay datos disponibles.' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#D3D1C7]">
      <table className="w-full border-collapse">
        <thead className="bg-[#F1EFE8]">
          <tr>
            {columns.map(col => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.07em] text-[#5F5E5A]"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={row.id || i}
                className={`
                  border-t border-[#D3D1C7] transition-colors duration-100
                  hover:bg-[#E8E6DF]
                  ${!row.active ? 'bg-[#FCEBEB] opacity-70' : 'bg-white'}
                `}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-[#2C2C2A]">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

---

### 3.6 Modal / Dialog

- Ancho máximo: 560px
- Centrado con overlay semitransparente (`rgba(44,44,42,0.5)`)
- Animación entrada: `opacity + translateY(8px → 0)` · 300ms · ease-out
- Animación salida: `opacity` solo · 200ms · ease-in
- Cierre: Esc, clic en overlay, botón cerrar

```jsx
// Modal.jsx — usando shadcn Dialog como base
function Modal({ open, onClose, title, children, footer }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[560px] rounded-xl bg-white shadow-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-medium text-[#2C2C2A]">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        {footer && (
          <DialogFooter className="flex gap-2 justify-end pt-4 border-t border-[#D3D1C7]">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

---

### 3.7 Toast / Notificación

Notificaciones flotantes en la esquina inferior derecha. Duración recomendada: 4000ms auto-dismiss (excepto errores: manual dismiss).

| Tipo | BG | Borde izquierdo | Ícono | Ejemplo |
|---|---|---|---|---|
| success | `#E1F5EE` | `4px solid #5DCAA5` | `check-circle` | "Usuario creado exitosamente." |
| error | `#FCEBEB` | `4px solid #F09595` | `x-circle` | "No se pudo guardar. Intenta de nuevo." |
| warning | `#FAEEDA` | `4px solid #EF9F27` | `alert-triangle` | "Los cambios no guardados se perderán." |
| info | `#E6F1FB` | `4px solid #378ADD` | `info` | "Sesión activa en otro dispositivo." |

Animación: `opacity + translateY(8px → 0)` · 300ms · ease-out al entrar. Salida: `opacity` · 200ms.

---

### 3.8 Sidebar Navigation

- Ancho fijo: **240px** en desktop
- Background: `#FFFFFF` con `border-right: 1px solid #D3D1C7`
- En mobile: se oculta con `translateX(-100%)` · animación 300ms ease-out
- Item activo: BG `#E1F5EE` · texto `#0F6E56` · borde izquierdo `3px solid #5DCAA5`
- Item hover: BG `#F1EFE8`
- Íconos: 20px outline, `currentColor`

```jsx
// SidebarItem.jsx
function SidebarItem({ icon: Icon, label, to, active }) {
  return (
    <NavLink
      to={to}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 text-sm font-medium
        transition-colors duration-100
        ${active
          ? 'bg-[#E1F5EE] text-[#0F6E56] border-l-[3px] border-[#5DCAA5] pl-[13px]'
          : 'text-[#5F5E5A] hover:bg-[#F1EFE8]'
        }
      `}
      aria-current={active ? 'page' : undefined}
    >
      <Icon size={20} aria-hidden />
      {label}
    </NavLink>
  )
}
```

---

### 3.9 Skeleton Loader

Placeholder animado durante carga de datos. Reemplaza el contenido mientras se espera la respuesta.

```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #D3D1C7 25%,
    #E8E6DF 50%,
    #D3D1C7 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1400ms linear infinite;
  border-radius: var(--radius-md);
}
```

- `aria-busy="true"` en el contenedor padre
- `aria-live="polite"` en el área de datos
- Cuando carga completa: reemplazar skeleton sin animación de fade (instantáneo)

---

### 3.10 Empty State

Estado para listas, tablas y dashboards sin datos. Siempre incluye orientación — nunca solo un ícono.

```jsx
// EmptyState.jsx
function EmptyState({ icon: Icon = Database, title, message, action }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center"
    >
      <div className="p-3 rounded-full bg-[#F1EFE8]">
        <Icon size={24} className="text-[#888780]" aria-hidden />
      </div>
      {title && (
        <p className="text-base font-medium text-[#2C2C2A]">{title}</p>
      )}
      <p className="text-sm text-[#5F5E5A] max-w-[320px]">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
```

Ejemplos de mensajes (voz del sistema):

- Tabla sin usuarios: "Todavía no hay usuarios registrados. Crea el primero para comenzar."
- Lista sin instrumentos: "Este módulo no tiene instrumentos configurados aún."
- Dashboard sin datos: "Aquí aparecerán los datos una vez que se registren sesiones."

---

## 4. Patrones de Layout

### 4.1 Grid y Breakpoints

| Breakpoint | Ancho mínimo | Columnas | Gutter | Margen lateral |
|---|---|---|---|---|
| Mobile | 320px | 4 cols | 16px | 16px |
| Tablet | 768px | 8 cols | 20px | 24px |
| Desktop | 1024px | 12 cols | 24px | 32px |
| Wide | 1280px | 12 cols | 24px | 48px |
| Max-width contenido | — | — | — | `max-width: 1400px; margin: 0 auto` |

### 4.2 Layouts de Pantalla

#### Login

```
┌─────────────────────────────────┐
│         Fondo Gray-50           │
│   ┌──────────────────────┐      │
│   │  Card máx. 420px     │      │
│   │  centrado vertical   │      │
│   │  y horizontal        │      │
│   └──────────────────────┘      │
└─────────────────────────────────┘
```

- Card centrada: `max-width: 420px`
- Sin sidebar
- Padding de card: `var(--space-8)` (32px)

#### Dashboard / Gestión

```
┌────────┬────────────────────────┐
│Sidebar │  Topbar                │
│ 240px  ├────────────────────────┤
│ fijo   │  Área de contenido     │
│        │  flexible              │
│        │  padding: space-6      │
└────────┴────────────────────────┘
```

- Sidebar fija 240px + área de contenido flexible
- Topbar: height 64px · border-bottom `1px solid #D3D1C7`

#### Gestión de Usuarios / Tablas

- Tabla full-width con filtros en topbar
- Formularios: 2 columnas en desktop (480px c/u), 1 columna en mobile
- Barra de acciones sobre la tabla: filtros a la izquierda, CTAs a la derecha

#### Formularios Extensos

- Dos columnas en desktop (480px c/u) con `gap: var(--space-6)`
- Una columna en mobile
- Grupos de campos separados por `var(--space-8)` entre secciones

### 4.3 Animación y Movimiento

#### Tokens de Animación

```css
:root {
  --duration-instant: 0ms;    /* Cambios sin percepción visual */
  --duration-fast:    100ms;  /* Hover, focus rings, toggles */
  --duration-normal:  200ms;  /* Transiciones de color, tooltips */
  --duration-medium:  300ms;  /* Modales, sidebars, dropdowns */
  --duration-slow:    500ms;  /* Skeleton shimmer */

  --ease-default: ease;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);  /* Elementos que entran */
  --ease-in:  cubic-bezier(0.4, 0.0, 1.0, 1.0); /* Elementos que salen */
}
```

#### Tabla de Animaciones por Componente

| Componente | Propiedad | Duración | Easing | Notas |
|---|---|---|---|---|
| Input focus ring | `box-shadow` | 100ms | ease | Foco inmediato |
| Button hover | `background-color` | 100ms | ease | Sin transform en hover |
| Button click | `transform scale` | 100ms | ease | `scale(0.98)` al presionar |
| Modal apertura | `opacity + translateY` | 300ms | ease-out | Entra desde Y+8px |
| Modal cierre | `opacity` | 200ms | ease-in | Solo fade |
| Toast | `opacity + translateY` | 300ms | ease-out | Desde esquina |
| Dropdown | `opacity + translateY` | 200ms | ease-out | Y-4px → Y=0 |
| Sidebar | `transform translateX` | 300ms | ease-out | Solo en mobile |
| Skeleton | `background shimmer` | 1400ms | linear | Loop hasta carga |
| Page transition | `opacity` | 200ms | ease | Solo en cambio de ruta |

> **Regla de oro:** Si quitar la animación hace que el sistema sea menos comprensible, es funcional. Si solo lo hace "más bonito", es decorativa y debe eliminarse.

---

## 5. Guía de Implementación

### 5.1 Stack Frontend

| Herramienta | Versión | Rol |
|---|---|---|
| Node.js | ≥18.0 (rec. 20.x LTS) | Runtime |
| Vite | 5.x | Bundler + dev server |
| React | 18.x | UI library |
| Tailwind CSS | 3.x | Utilidades CSS (requerido por shadcn) |
| shadcn/ui | latest CLI | Componentes sobre Radix UI |
| React Router | 6.x | Enrutamiento SPA y rutas protegidas |
| Axios | 1.x | HTTP client + interceptores JWT |
| Lucide React | latest | Íconos MIT — solo los usados (tree-shaking) |

**Lenguaje:** JavaScript ES2022 (no TypeScript — MVP rápido, sin overhead de compilación)

### 5.2 Configuración Inicial

```bash
# 1. Crear proyecto
npm create vite@5 frontend -- --template react
cd frontend && npm install

# 2. Tailwind CSS
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p

# 3. Runtime deps
npm install react-router-dom@6 axios@1 lucide-react @fontsource/inter

# 4. Inicializar shadcn/ui
npx shadcn@latest init
# Style: Default | Color: Slate | CSS variables: yes

# 5. Componentes shadcn para M1
npx shadcn@latest add button input label card badge table dialog alert toast
```

### 5.3 Integración de Tokens

#### `src/styles/tokens/colors.css`

```css
:root {
  /* Primario */
  --color-primary:           #5DCAA5;
  --color-primary-dark:      #0F6E56;
  --color-primary-light:     #E1F5EE;
  --color-primary-text:      #04342C;

  /* Roles */
  --color-role-admin:        #534AB7;
  --color-role-admin-bg:     #EEEDFE;
  --color-role-researcher:   #1D9E75;
  --color-role-researcher-bg:#E1F5EE;
  --color-role-aplicador:    #BA7517;
  --color-role-aplicador-bg: #FAEEDA;

  /* Estados */
  --color-error:             #F09595;
  --color-error-text:        #A32D2D;
  --color-error-bg:          #FCEBEB;
  --color-warning:           #EF9F27;
  --color-warning-text:      #854F0B;
  --color-warning-bg:        #FAEEDA;
  --color-success:           #5DCAA5;
  --color-success-text:      #0F6E56;
  --color-success-bg:        #E1F5EE;
  --color-info:              #378ADD;
  --color-info-text:         #185FA5;
  --color-info-bg:           #E6F1FB;

  /* Texto */
  --color-text-primary:      #2C2C2A;
  --color-text-secondary:    #5F5E5A;
  --color-text-tertiary:     #888780;
  --color-text-placeholder:  #B4B2A9;

  /* Superficies */
  --color-surface:           #FFFFFF;
  --color-bg-page:           #F1EFE8;
  --color-bg-subtle:         #E8E6DF;

  /* Bordes */
  --color-border:            #D3D1C7;
  --color-border-focus:      #5DCAA5;
  --color-border-error:      #F09595;
}
```

#### `tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5DCAA5',
          dark: '#0F6E56',
          light: '#E1F5EE',
        },
        gray: {
          50:  '#F1EFE8',
          100: '#E8E6DF',
          200: '#D3D1C7',
          300: '#BFBDB5',
          400: '#888780',
          500: '#706F69',
          600: '#5F5E5A',
          700: '#4A4A46',
          800: '#3D3C38',
          900: '#2C2C2A',
        },
        error: {
          DEFAULT: '#F09595',
          text: '#A32D2D',
          bg: '#FCEBEB',
        },
        warning: {
          DEFAULT: '#EF9F27',
          text: '#854F0B',
          bg: '#FAEEDA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        pill: '999px',
      },
      boxShadow: {
        focus: '0 0 0 3px rgba(93, 202, 165, 0.2)',
        sm: '0 1px 2px rgba(44,44,42,0.06), 0 1px 3px rgba(44,44,42,0.10)',
        md: '0 4px 6px rgba(44,44,42,0.07), 0 2px 4px rgba(44,44,42,0.06)',
        lg: '0 10px 15px rgba(44,44,42,0.08), 0 4px 6px rgba(44,44,42,0.05)',
      },
      transitionDuration: {
        instant: '0ms',
        fast: '100ms',
        normal: '200ms',
        medium: '300ms',
        slow: '500ms',
      },
      transitionTimingFunction: {
        'ease-out-smooth': 'cubic-bezier(0.0, 0.0, 0.2, 1)',
        'ease-in-smooth':  'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
      },
    },
  },
  plugins: [],
}
```

#### Proxy Vite (`vite.config.js`)

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // mock server
        changeOrigin: true,
      }
    }
  }
})
```

### 5.4 Estructura de Carpetas del Proyecto

```
frontend/
├── public/
├── src/
│   ├── api/
│   │   └── client.js          # Instancia Axios + interceptores JWT + funciones de endpoint
│   ├── context/
│   │   └── AuthContext.jsx    # Estado global: token, rol, login(), logout()
│   ├── styles/
│   │   ├── tokens/
│   │   │   ├── colors.css     # Variables CSS de color (copiables de sección 5.3)
│   │   │   ├── typography.css # Variables CSS de tipografía
│   │   │   ├── spacing.css    # Variables CSS de espaciado
│   │   │   ├── motion.css     # Variables CSS de animación
│   │   │   └── index.css      # Re-exporta todos los tokens
│   │   └── globals.css        # Reset + @import tokens + utilities globales
│   ├── components/
│   │   ├── ui/                # Componentes shadcn generados (no editar directamente)
│   │   │   ├── button.jsx
│   │   │   ├── input.jsx
│   │   │   ├── badge.jsx
│   │   │   └── ...
│   │   └── app/               # Componentes de dominio propios
│   │       ├── Button.jsx     # Wrapper del sistema sobre shadcn Button
│   │       ├── FormField.jsx  # Input + Label + Error + Helper
│   │       ├── RoleBadge.jsx  # Badge de rol (Admin/Investigador/Aplicador)
│   │       ├── StatusBadge.jsx
│   │       ├── DataTable.jsx  # Tabla con empty state integrado
│   │       ├── Modal.jsx      # Wrapper Dialog con animaciones del sistema
│   │       ├── Toast.jsx      # Notificaciones flotantes
│   │       ├── Sidebar.jsx    # Navegación lateral
│   │       ├── EmptyState.jsx # Estado vacío reutilizable
│   │       └── SkeletonRow.jsx# Skeleton para filas de tabla
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── UsersPage.jsx
│   │   ├── InstrumentsPage.jsx
│   │   ├── MetricsPage.jsx
│   │   └── SubjectsPage.jsx
│   ├── lib/
│   │   └── utils.js           # cn() de shadcn + helpers
│   ├── main.jsx
│   └── index.css              # @import './styles/tokens/index.css' + base styles
├── index.html
├── vite.config.js
└── tailwind.config.js
```

### 5.5 Accesibilidad

Requisitos **bloqueantes** para release (WCAG 2.1 AA):

| Principio | Implementación |
|---|---|
| Contraste mínimo | Texto normal: 4.5:1 · Texto grande: 3:1 · UI: 3:1 |
| Navegación por teclado | Todo el flujo funcional navegable sin ratón |
| Focus visible | Ring `0 0 0 3px rgba(93,202,165,0.2)` en todos los elementos interactivos |
| Labels en formularios | Cada `<input>` tiene `<label htmlFor>`. Sin placeholders como único label |
| Mensajes de error | `aria-describedby` al campo · `role="alert"` en el mensaje |
| Iconos sin texto | `aria-label` o `aria-hidden` según si el ícono es decorativo o informativo |

Herramienta recomendada: **axe DevTools** (extensión de navegador). Complementar con navegación manual por teclado en cada pantalla antes del release.

### 5.6 Voz del Sistema y Microcopy

La voz del sistema es siempre clara, directa y humana.

**Principios:**

- Directo, no críptico: el mensaje dice exactamente qué pasó y qué hacer.
- Orientador, no acusador: los errores guían, no culpan.
- Sin tecnicismos: nunca mostrar códigos HTTP, stack traces ni términos de base de datos.
- Voz activa: "Inicia sesión" no "La sesión debe ser iniciada".

**Estructura de mensajes:**

| Tipo | Fórmula | Ejemplo |
|---|---|---|
| Validación de campo | [Qué está mal] + [Cómo corregirlo] | "La contraseña debe tener al menos 8 caracteres." |
| Error de auth | [Descripción neutral] + [Acción sugerida] | "Correo o contraseña incorrectos. Intenta de nuevo." |
| Sin permisos | [Qué no puede hacer] + [A quién contactar] | "No tienes acceso a esta sección. Contacta al administrador." |
| Error de servidor | [Qué pasó] + [Qué hacer] | "Algo salió mal. Por favor intenta en unos momentos." |
| Cuenta desactivada | [Estado claro] + [Acción disponible] | "Tu cuenta está desactivada. Contacta al administrador." |
| Sesión expirada | [Qué ocurrió] + [Acción inmediata] | "Tu sesión ha expirado. Inicia sesión nuevamente." |
| Éxito | [Qué se logró] | "Usuario creado exitosamente con rol Investigador." |

**Tabla de corrección (sí / no):**

| Sí decimos | No decimos |
|---|---|
| "Sesión iniciada. Bienvenido de vuelta." | "Login exitoso. Token JWT generado." |
| "Tu sesión ha expirado. Inicia sesión nuevamente." | "Error 401 — token inválido o expirado." |
| "Cuenta desactivada. Contacta al administrador." | "403 Forbidden — active=FALSE detected." |
| "No tienes permiso para esta acción." | "HTTP 403 — rol insuficiente para el endpoint." |
| "Correo o contraseña incorrectos. Intenta de nuevo." | "Credenciales inválidas — user not found." |

---

## 6. Plan de Acción

### 6.1 Estructura de Carpetas a Crear

```bash
# Desde la raíz del repositorio, una vez creado el proyecto Vite:
mkdir -p frontend/src/styles/tokens
mkdir -p frontend/src/components/app
mkdir -p frontend/src/components/ui
mkdir -p frontend/src/api
mkdir -p frontend/src/context
mkdir -p frontend/src/pages
mkdir -p frontend/src/lib
```

### 6.2 Archivos de Tokens — Contenido Completo

#### `src/styles/tokens/colors.css` — listo para copiar

Ver sección 5.3 de esta guía.

#### `src/styles/tokens/typography.css`

```css
:root {
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --font-size-display: 1.75rem;
  --font-size-h1:      1.375rem;
  --font-size-h2:      1.125rem;
  --font-size-h3:      1rem;
  --font-size-body:    1rem;
  --font-size-small:   0.875rem;
  --font-size-caption: 0.8125rem;
  --font-size-label:   0.6875rem;
  --font-size-code:    0.8125rem;

  --font-weight-regular: 400;
  --font-weight-medium:  500;

  --line-height-tight:  1.2;
  --line-height-normal: 1.5;
  --line-height-button: 1;

  --letter-spacing-label:  0.07em;
  --letter-spacing-normal: normal;
}
```

#### `src/styles/tokens/spacing.css`

```css
:root {
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-5:  1.25rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-pill: 999px;
}
```

#### `src/styles/tokens/motion.css`

```css
:root {
  --duration-instant: 0ms;
  --duration-fast:    100ms;
  --duration-normal:  200ms;
  --duration-medium:  300ms;
  --duration-slow:    500ms;

  --ease-default: ease;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in:  cubic-bezier(0.4, 0.0, 1.0, 1.0);

  --shadow-focus: 0 0 0 3px rgba(93, 202, 165, 0.2);
  --shadow-sm: 0 1px 2px rgba(44,44,42,0.06), 0 1px 3px rgba(44,44,42,0.10);
  --shadow-md: 0 4px 6px rgba(44,44,42,0.07), 0 2px 4px rgba(44,44,42,0.06);
  --shadow-lg: 0 10px 15px rgba(44,44,42,0.08), 0 4px 6px rgba(44,44,42,0.05);

  --overlay-bg: rgba(44, 44, 42, 0.5);
}
```

#### `src/styles/tokens/index.css`

```css
@import './colors.css';
@import './typography.css';
@import './spacing.css';
@import './motion.css';
```

#### `src/index.css`

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
@import './styles/tokens/index.css';

@layer base {
  body {
    font-family: var(--font-sans);
    font-size: var(--font-size-body);
    color: var(--color-text-primary);
    background-color: var(--color-bg-page);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Focus global — nunca usar outline:none sin reemplazar */
  :focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus);
  }
}

@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
```

---

### 6.3 Componentes Priorizados

#### Prioridad 1 — Críticos (M1 no puede avanzar sin ellos)

| Componente | Variantes mínimas | Tokens consumidos |
|---|---|---|
| `Button` | primary, secondary, ghost, danger, disabled, loading | `--color-primary`, `--color-error`, `--duration-fast` |
| `FormField` | default, focus, error, disabled | `--color-border`, `--color-error`, `--shadow-focus` |
| `RoleBadge` | admin, researcher, aplicador | `--color-role-*` |
| `AuthContext` | login, logout, token storage | — |
| `ProtectedRoute` | role-based redirect | — |
| `LoginPage` | layout card centrado | `--space-*`, `--radius-lg` |

#### Prioridad 2 — Importantes (consistencia de M1–M4)

| Componente | Variantes mínimas | Tokens consumidos |
|---|---|---|
| `DataTable` | default, loading (skeleton), empty, row inactive | `--color-bg-subtle`, `--color-error-bg` |
| `Modal` | default, confirm, danger | `--shadow-lg`, `--overlay-bg`, `--duration-medium` |
| `Toast` | success, error, warning, info | `--color-*-bg`, `--color-*-text` |
| `StatusBadge` | active, inactive, pending | `--color-success-*`, `--color-error-*` |
| `Sidebar` | desktop fixed, mobile slide | `--color-primary-light`, `--duration-medium` |
| `EmptyState` | genérico, con CTA | `--color-bg-subtle`, `--color-text-tertiary` |

#### Prioridad 3 — Opcionales (madurez del sistema)

| Componente | Variantes mínimas | Tokens consumidos |
|---|---|---|
| `SkeletonRow` | 1, 2, 3 columnas | shimmer animation |
| `Tooltip` | top, bottom, left, right | `--shadow-md`, `--duration-normal` |
| `Select` | default, focus, error | mismos que `FormField` |
| `Checkbox` / `Radio` | default, checked, disabled | `--color-primary`, `--shadow-focus` |
| `Pagination` | basic, with page size | `--color-primary`, `--color-border` |
| `Topbar` | con avatar + rol + logout | `--color-role-*` |
| `PageHeader` | title + subtitle + actions | tipografía tokens |

---

### 6.4 Checklist de Implementación

```
Tokens
  [ ] Crear src/styles/tokens/ con los 4 archivos CSS
  [ ] Importar tokens en src/index.css
  [ ] Agregar colores y radios al tailwind.config.js
  [ ] Instalar @fontsource/inter (400 y 500)

Configuración
  [ ] Instalar y configurar shadcn/ui (Style: Default, CSS variables: yes)
  [ ] Agregar componentes shadcn: button input label card badge table dialog alert toast
  [ ] Configurar proxy Vite → mock server :3000

Componentes P1 (antes de cualquier pantalla)
  [ ] Button.jsx — 5 variantes + loading
  [ ] FormField.jsx — label + input + error + helper
  [ ] RoleBadge.jsx — 3 roles
  [ ] AuthContext.jsx — login, logout, estado de sesión
  [ ] ProtectedRoute.jsx — redirección por rol

Pantallas M1
  [ ] LoginPage.jsx — card centrada, form, feedback de error
  [ ] DashboardPage.jsx — layout sidebar + topbar
  [ ] UsersPage.jsx — tabla + filtros + modal crear usuario

Componentes P2 (durante M1–M4)
  [ ] DataTable.jsx
  [ ] Modal.jsx
  [ ] Toast.jsx + sistema de notificaciones
  [ ] StatusBadge.jsx
  [ ] Sidebar.jsx
  [ ] EmptyState.jsx

Accesibilidad (antes del release de M1)
  [ ] Pasar axe DevTools en LoginPage y UsersPage
  [ ] Verificar navegación completa por teclado en ambas pantallas
  [ ] Confirmar aria-describedby en todos los campos con error
  [ ] Confirmar aria-label en todos los icon-only buttons
```

---

*Design System generado a partir de DSFDR v1.0 (Marzo 2026) — Sistema de Perfiles Lingüísticos.*
*Mantenido por el equipo de frontend. Cambios mayores (paleta, tipografía base) requieren aprobación de Dirección de Producto.*
