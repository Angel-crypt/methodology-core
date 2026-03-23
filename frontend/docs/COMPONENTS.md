# Componentes — Sistema de Perfiles Lingüísticos

Catálogo completo de componentes del Design System con props, variantes y ejemplos de uso.

Todos los componentes se importan desde el barrel:

```jsx
import { Button, FormField, Modal, DataTable } from '@/components/app'
// o con ruta relativa desde pages/:
import { Button, FormField } from '../components/app'
```

**Galería visual:** `http://localhost:5173/gallery` — todos los componentes en vivo con sus variantes y estados.

---

## Índice

- [Button](#button)
- [PillToggle](#pilltoggle)
- [FormField](#formfield)
- [Modal](#modal)
- [DataTable](#datatable)
- [RoleBadge](#rolebadge)
- [StatusBadge](#statusbadge)
- [Alert](#alert)
- [Toast + useToast](#toast--usetoast)
- [Sidebar](#sidebar)
- [EmptyState](#emptystate)
- [Spinner](#spinner)
- [Typography](#typography)
- [SkeletonRow](#skeletonrow)

---

## Button

Botón DS con múltiples variantes y tamaños. Soporte para ícono, estado de carga y composición con `forwardRef`.

```jsx
import { Button } from '@/components/app'
import { Plus } from 'lucide-react'

// Botón primario básico
<Button onClick={handleClick}>Guardar</Button>

// Con ícono y variante
<Button variant="secondary" icon={Plus} iconPosition="left" size="sm">
  Agregar
</Button>

// Estado de carga
<Button loading>Guardando...</Button>

// Solo ícono
<Button variant="icon" icon={Plus} aria-label="Agregar elemento" />
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'ghost' \| 'danger' \| 'icon'` | `'primary'` | Variante visual del botón |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamaño del botón (ignorado en variant `'icon'`) |
| `loading` | `boolean` | `false` | Muestra spinner y deshabilita el botón |
| `disabled` | `boolean` | `undefined` | Deshabilita el botón |
| `icon` | Componente Lucide | `undefined` | Ícono a renderizar |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Posición del ícono respecto al texto |
| `className` | `string` | `''` | Clases adicionales |
| `...props` | `HTMLButtonElement` | — | Props nativas del botón |

Ver en galería: `/gallery#button`

---

## PillToggle

Botón de selección tipo pill para grupos de filtros mutuamente excluyentes.
Comunica el estado activo visualmente y mediante `aria-pressed` para accesibilidad.

```jsx
import { PillToggle } from '@/components/app'
import { useState } from 'react'

const OPTIONS = [
  { value: '',         label: 'Todos' },
  { value: 'active',  label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

function FilterBar() {
  const [selected, setSelected] = useState('')

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
      {OPTIONS.map(({ value, label }) => (
        <PillToggle
          key={label}
          selected={selected === value}
          onClick={() => setSelected(value)}
        >
          {label}
        </PillToggle>
      ))}
    </div>
  )
}
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `selected` | `boolean` | `false` | Marca el pill como activo (color primario + `aria-pressed`) |
| `disabled` | `boolean` | `false` | Deshabilita el botón |
| `children` | `ReactNode` | — | Etiqueta visible del pill |
| `className` | `string` | `''` | Clases adicionales |
| `...props` | `HTMLButtonElement` | — | Props nativas del botón (`onClick`, etc.) |

**Cuándo usarlo:** En barras de filtro donde las opciones son mutuamente excluyentes
y el espacio visual requiere una presentación compacta y pill-shaped.
No usar para acciones — usar `Button` para eso.

Ver en galería: `/gallery#pill-toggle`

---

## FormField

Campo de formulario accesible: label + input + mensaje de helper o error. Implementa `aria-invalid`, `aria-describedby` y marca el campo requerido.

```jsx
import { FormField } from '@/components/app'

<FormField
  id="email"
  label="Correo electrónico"
  type="email"
  required
  placeholder="usuario@dominio.com"
  helper="Usaremos este correo para notificaciones"
/>

// Con error
<FormField
  id="password"
  label="Contraseña"
  type="password"
  error="La contraseña debe tener al menos 8 caracteres"
/>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `id` | `string` | — | ID del input (requerido para asociar label) |
| `label` | `string` | `undefined` | Texto del label |
| `type` | `string` | `'text'` | Tipo de input HTML |
| `error` | `string` | `undefined` | Mensaje de error (reemplaza a `helper`) |
| `helper` | `string` | `undefined` | Texto de ayuda bajo el input |
| `required` | `boolean` | `false` | Marca el campo como requerido (asterisco visual) |
| `disabled` | `boolean` | `undefined` | Deshabilita el input |
| `className` | `string` | `''` | Clases adicionales para el input |
| `...inputProps` | `HTMLInputElement` | — | Props nativas del input |

Ver en galería: `/gallery#formfield`

---

## Modal

Modal accesible construido sobre `@radix-ui/react-dialog`. Incluye focus trap nativo, cierre con tecla Escape, overlay con bloqueo de scroll y `aria-modal`.

```jsx
import { Modal, Button } from '@/components/app'
import { useState } from 'react'

function MiPagina() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Confirmar acción"
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="danger">Eliminar</Button>
          </div>
        }
      >
        <p>¿Estás seguro de que deseas continuar?</p>
      </Modal>
    </>
  )
}
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `open` | `boolean` | — | Controla si el modal está visible |
| `onClose` | `() => void` | — | Callback cuando el modal se cierra (Escape, click en overlay, botón X) |
| `title` | `string` | `undefined` | Título del modal (renderizado como `<h2>`) |
| `children` | `ReactNode` | — | Contenido del cuerpo del modal |
| `footer` | `ReactNode` | `undefined` | Contenido del pie del modal (botones de acción) |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Ancho máximo: `sm`=400px, `md`=560px (token), `lg`=720px |

Ver en galería: `/gallery#modal`

---

## DataTable

Tabla de datos con skeleton de carga y estado vacío integrados.

```jsx
import { DataTable, RoleBadge, StatusBadge } from '@/components/app'

const columns = [
  { key: 'name', label: 'Nombre' },
  { key: 'role', label: 'Rol', render: (value) => <RoleBadge role={value} /> },
  { key: 'status', label: 'Estado', render: (value) => <StatusBadge status={value} /> },
]

const data = [
  { id: 1, name: 'Ana García', role: 'admin', status: 'active' },
  { id: 2, name: 'Luis Pérez', role: 'researcher', status: 'active', active: false },
]

<DataTable
  columns={columns}
  data={data}
  loading={isLoading}
  emptyMessage="No se encontraron usuarios"
/>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `columns` | `Array<{ key: string, label: string, render?: (value, row) => ReactNode }>` | `[]` | Definición de columnas |
| `data` | `Array<object>` | `[]` | Filas de datos. Usa `row.id` como key, o el índice si no existe |
| `loading` | `boolean` | `false` | Si `true`, muestra 5 `SkeletonRow` en lugar de los datos |
| `emptyMessage` | `string` | `'No hay datos disponibles'` | Mensaje cuando `data` está vacío |

> Las filas con `row.active === false` reciben la clase `row-inactive` (texto atenuado).

> La función `render` recibe `(value, row)` donde `value` es el valor de la celda y `row` es el objeto completo de la fila.

Ver en galería: `/gallery#datatable`

---

## RoleBadge

Badge visual para el rol de un usuario. Muestra ícono y etiqueta con los colores del DS.

```jsx
import { RoleBadge } from '@/components/app'

<RoleBadge role="admin" />       // Crown + "Admin" en púrpura
<RoleBadge role="researcher" />  // Search + "Investigador" en verde
<RoleBadge role="aplicador" />   // ClipboardList + "Aplicador" en ámbar
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `role` | `'admin' \| 'researcher' \| 'aplicador'` | — | Rol a mostrar. Retorna `null` si no coincide |

Ver en galería: `/gallery#rolebadge`

---

## StatusBadge

Badge visual para el estado de un registro. Muestra ícono y etiqueta con los colores del DS.

```jsx
import { StatusBadge } from '@/components/app'

<StatusBadge status="active" />   // CheckCircle + "Activo" en verde
<StatusBadge status="inactive" /> // XCircle + "Inactivo" en coral
<StatusBadge status="pending" />  // Clock + "Pendiente" en ámbar
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `status` | `'active' \| 'inactive' \| 'pending'` | — | Estado a mostrar. Retorna `null` si no coincide |

Ver en galería: `/gallery#statusbadge`

---

## Alert

Alerta estática inline para mensajes de feedback en páginas y formularios.

```jsx
import { Alert } from '@/components/app'

<Alert variant="success" title="Usuario creado">
  El nuevo usuario ha sido registrado correctamente.
</Alert>

<Alert variant="error" title="Error de validación">
  Revisa los campos marcados antes de continuar.
</Alert>

<Alert variant="warning">
  Este instrumento tiene métricas sin definir.
</Alert>

<Alert variant="info" title="Información">
  Los cambios se aplican al día siguiente.
</Alert>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `variant` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Variante visual (color + ícono) |
| `title` | `string` | `undefined` | Título en negrita (medio) sobre el contenido |
| `children` | `ReactNode` | `undefined` | Contenido del cuerpo de la alerta |
| `icon` | Componente Lucide | `undefined` | Ícono alternativo al predeterminado de la variante |

Ver en galería: `/gallery#alert`

---

## Toast + useToast

Sistema de notificaciones toast. `useToast` es el hook para disparar toasts; `ToastContainer` renderiza el stack en la esquina inferior derecha via portal.

```jsx
import { ToastContainer, useToast } from '@/components/app'

function MiPagina() {
  const { toasts, toast, dismiss } = useToast()

  const handleGuardar = async () => {
    try {
      await guardarDatos()
      toast({ type: 'success', title: 'Guardado', message: 'Los cambios se guardaron correctamente.' })
    } catch {
      toast({ type: 'error', title: 'Error', message: 'No se pudo guardar. Intenta de nuevo.' })
    }
  }

  return (
    <>
      <Button onClick={handleGuardar}>Guardar</Button>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}
```

**Props de `useToast` — función `toast()`:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `type` | `'success' \| 'error' \| 'warning' \| 'info'` | `'info'` | Variante visual |
| `title` | `string` | `undefined` | Título del toast |
| `message` | `string` | `undefined` | Cuerpo del toast |
| `duration` | `number` (ms) | `4000` (0 en errores) | Tiempo hasta auto-dismiss. `0` = sin auto-dismiss |

**Retorno de `useToast()`:**

| Valor | Tipo | Descripción |
|-------|------|-------------|
| `toasts` | `Array` | Lista de toasts activos |
| `toast` | `function` | Dispara un nuevo toast, retorna el `id` |
| `dismiss` | `(id) => void` | Cierra un toast por id |

**Props de `ToastContainer`:**

| Prop | Tipo | Descripción |
|------|------|-------------|
| `toasts` | `Array` | Lista de toasts (del hook) |
| `onDismiss` | `(id) => void` | Callback de cierre (la función `dismiss` del hook) |

Ver en galería: `/gallery#toast`

---

## Sidebar

Barra de navegación lateral con `NavLink` de react-router-dom. Aplica clase `is-active` al ítem de la ruta activa. Soporta `renderItem` para reemplazar el render por defecto (útil para hash anchors en lugar de rutas de React Router).

```jsx
import { Sidebar } from '@/components/app'
import { Users, BookOpen, BarChart2 } from 'lucide-react'

// Uso estándar con NavLink
const navItems = [
  { label: 'Usuarios', icon: Users, to: '/users', end: true },
  { label: 'Instrumentos', icon: BookOpen, to: '/instruments' },
  { label: 'Métricas', icon: BarChart2, to: '/metrics' },
]

<Sidebar
  items={navItems}
  header={<span>Sistema de Perfiles</span>}
  footer={<span style={{ fontSize: 'var(--font-size-caption)' }}>v1.0</span>}
/>

// Con renderItem personalizado (hash anchors, sin React Router)
<Sidebar
  items={sections}
  renderItem={(item) => (
    <a href={`#${item.id}`} className={`sidebar-item${active === item.id ? ' is-active' : ''}`}>
      {item.label}
    </a>
  )}
/>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `items` | `Array<{ id?: string, label: string, icon?: LucideComponent, to?: string, end?: boolean }>` | `[]` | Ítems de navegación |
| `header` | `ReactNode` | `undefined` | Slot de encabezado — renderizado como está, sin wrapper adicional |
| `renderItem` | `(item) => ReactNode` | `undefined` | Función de render por ítem. Si se omite, usa `NavLink` con `item.to` |
| `footer` | `ReactNode` | `undefined` | Slot de pie, pinned al fondo con borde superior |

Ver en galería: `/gallery#sidebar`

---

## EmptyState

Placeholder para secciones sin contenido. Incluye ícono, título, mensaje y una acción opcional.

```jsx
import { EmptyState, Button } from '@/components/app'
import { Users } from 'lucide-react'

<EmptyState
  icon={Users}
  title="No hay usuarios registrados"
  message="Crea el primer usuario para comenzar."
  action={<Button size="sm" onClick={handleCreate}>Crear usuario</Button>}
/>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `icon` | Componente Lucide | `Database` | Ícono decorativo |
| `title` | `string` | `undefined` | Título del estado vacío |
| `message` | `string` | `undefined` | Descripción o guía de acción |
| `action` | `ReactNode` | `undefined` | Elemento de acción (botón, link) |

Ver en galería: `/gallery#emptystate`

---

## Spinner

Indicador de carga animado accesible (`role="status"` + `aria-label`). Usa el ícono `Loader2` de lucide-react con `animate-spin`.

```jsx
import { Spinner } from '@/components/app'

// Spinner primario (color del DS)
<Spinner />

// Spinner que hereda el color del contexto
<Spinner color="current" size={20} />

// Spinner con label personalizado
<Spinner label="Guardando cambios..." />
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `size` | `number` | `16` | Tamaño del ícono en píxeles |
| `color` | `'primary' \| 'current'` | `'primary'` | `'primary'` usa `var(--color-primary)`; `'current'` hereda el color del padre |
| `label` | `string` | `'Cargando...'` | Texto accesible leído por lectores de pantalla (`aria-label` + `.sr-only`) |

Ver en galería: `/gallery#spinner`

---

## Typography

Renderiza texto semántico aplicando los tokens DS de tipografía. Usa el elemento HTML correcto para cada variante.

```jsx
import { Typography } from '@/components/app'

<Typography as="h1">Gestión de Usuarios</Typography>
<Typography as="h2">Usuarios activos</Typography>
<Typography as="body">Selecciona un usuario para ver sus detalles.</Typography>
<Typography as="caption">Última actualización: hace 2 horas</Typography>
<Typography as="label">ID de sesión</Typography>
<Typography as="code">POST /api/users</Typography>
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `as` | `'display' \| 'h1' \| 'h2' \| 'h3' \| 'body' \| 'small' \| 'caption' \| 'label' \| 'code'` | `'body'` | Variante tipográfica y elemento HTML a renderizar |
| `children` | `ReactNode` | — | Contenido del texto |
| `className` | `string` | `''` | Clases adicionales |
| `style` | `CSSProperties` | `undefined` | Estilos inline adicionales (se fusionan con los del token) |

**Elementos HTML por variante:**

| Variante | Tag HTML |
|----------|---------|
| `display`, `body`, `small` | `<p>` |
| `h1` | `<h1>` |
| `h2` | `<h2>` |
| `h3` | `<h3>` |
| `caption`, `label` | `<span>` |
| `code` | `<code>` |

Ver en galería: `/gallery#typography`

---

## SkeletonRow

Fila de tabla con celdas skeleton animadas. Usado internamente por `DataTable` durante la carga.

```jsx
import { SkeletonRow } from '@/components/app'

// Dentro de un <tbody> cuando loading=true
<SkeletonRow cols={4} />
```

**Props:**

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `cols` | `number` | `3` | Número de celdas skeleton a renderizar |

> Los anchos de las celdas skeleton varían cíclicamente (`70%`, `50%`, `30%`, `60%`, `45%`, `55%`) para dar variedad visual. El elemento tiene `aria-hidden="true"`.

Ver en galería: `/gallery#skeletonrow`

---

_Última actualización: 2026-03-22_
_Actualizar al agregar nuevos componentes a `src/components/app/`._
