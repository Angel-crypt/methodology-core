import PropTypes from 'prop-types'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  FileText,
  Trash2,
  Plus,
} from 'lucide-react'

import {
  Button,
  FormField,
  RoleBadge,
  StatusBadge,
  DataTable,
  EmptyState,
  Modal,
  ToastContainer,
  Alert,
  Spinner,
  Sidebar,
  Typography,
  useToast,
  PillToggle,
} from '../components/app'

/* ─────────────────────────────────────────────────────────────
  INTERNAL: ComponentSection
───────────────────────────────────────────────────────────── */

function ComponentSection({ id, title, description, children, props: propsDef = [], code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <section
      id={id}
      style={{
        marginBottom: 'var(--space-12)',
        scrollMarginTop: 'var(--space-6)',
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: 'var(--font-size-small)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Preview */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {children}
      </div>

      {/* Props table */}
      {propsDef.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p
            style={{
              fontSize: 'var(--font-size-label)',
              fontWeight: 'var(--font-weight-medium)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--letter-spacing-label)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-2)',
            }}
          >
            Props
          </p>
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Default</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                {propsDef.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-code)',
                          color: 'var(--color-primary-dark)',
                        }}
                      >
                        {p.name}
                      </code>
                    </td>
                    <td>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-code)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {p.type}
                      </code>
                    </td>
                    <td>
                      <code
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 'var(--font-size-code)',
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        {p.default ?? '—'}
                      </code>
                    </td>
                    <td
                      style={{
                        fontSize: 'var(--font-size-small)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {p.desc}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code block */}
      {code && (
        <div style={{ position: 'relative' }}>
          <pre
            style={{
              background: 'var(--color-bg-page)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--font-size-code)',
              color: 'var(--color-text-primary)',
              overflowX: 'auto',
              lineHeight: 'var(--line-height-normal)',
            }}
          >
            <code>{code}</code>
          </pre>
          <button
            onClick={handleCopy}
            style={{
              position: 'absolute',
              top: 'var(--space-3)',
              right: 'var(--space-3)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-1) var(--space-2-5)',
              fontSize: 'var(--font-size-caption)',
              fontWeight: 'var(--font-weight-medium)',
              cursor: 'pointer',
              color: copied ? 'var(--color-success-text)' : 'var(--color-text-secondary)',
              transition: `color var(--duration-normal)`,
            }}
          >
            {copied ? 'Copiado ✓' : 'Copiar'}
          </button>
        </div>
      )}
    </section>
  )
}

ComponentSection.propTypes = {
  id: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  children: PropTypes.node,
  props: PropTypes.object,
  code: PropTypes.string,
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL: GallerySidebar
   ───────────────────────────────────────────────────────────── */

const CATEGORIES = [
  {
    label: 'Primitivos',
    items: [
      { id: 'button', label: 'Button' },
      { id: 'pill-toggle', label: 'PillToggle' },
      { id: 'typography', label: 'Typography' },
      { id: 'spinner', label: 'Spinner' },
      { id: 'role-badge', label: 'RoleBadge' },
      { id: 'status-badge', label: 'StatusBadge' },
    ],
  },
  {
    label: 'Formulario',
    items: [{ id: 'form-field', label: 'FormField' }],
  },
  {
    label: 'Feedback',
    items: [
      { id: 'alert', label: 'Alert' },
      { id: 'toast', label: 'Toast' },
      { id: 'modal', label: 'Modal' },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { id: 'data-table', label: 'DataTable' },
      { id: 'empty-state', label: 'EmptyState' },
    ],
  },
]

const ALL_SECTIONS = CATEGORIES.flatMap((cat) => cat.items)

function GallerySidebar({ search, onSearch, activeId, onNavigate }) {
  const filtered = ALL_SECTIONS.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  )

  const sidebarHeader = (
    <>
      <div style={{ borderBottom: '1px solid var(--color-border)', padding: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
        <p style={{ fontSize: 'var(--font-size-body)', fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text-primary)' }}>
          Design System
        </p>
        <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
          v1.0
        </p>
      </div>
      <div style={{ padding: 'var(--space-3)' }}>
        <input
          type="search"
          placeholder="Buscar componente..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="input-base"
          style={{ height: 'var(--input-height-sm)', fontSize: 'var(--font-size-small)' }}
          aria-label="Buscar componentes"
        />
      </div>
    </>
  )

  return (
    <Sidebar
      items={filtered}
      header={sidebarHeader}
      renderItem={(item) => (
        <a
          href={`#${item.id}`}
          onClick={(e) => {
            e.preventDefault()
            onNavigate(item.id)
            document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
          }}
          className={`sidebar-item${activeId === item.id ? ' is-active' : ''}`}
        >
          {item.label}
        </a>
      )}
    />
  )
}

GallerySidebar.propTypes = {
  search: PropTypes.string.isRequired,
  onSearch: PropTypes.func.isRequired,
  activeId: PropTypes.string,
  onNavigate: PropTypes.func.isRequired,
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL: GalleryTopbar
   ───────────────────────────────────────────────────────────── */

function GalleryTopbar() {
  return (
    <header
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LayoutDashboard size={18} style={{ color: 'var(--color-primary-text)' }} aria-hidden="true" />
        </div>
        <div>
          <h1
            style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 'var(--font-weight-medium)',
              color: 'var(--color-text-primary)',
              lineHeight: 'var(--line-height-tight)',
            }}
          >
            Design System
          </h1>
          <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
            v1.0 · Galería de componentes
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span
          style={{
            fontSize: 'var(--font-size-caption)',
            color: 'var(--color-text-tertiary)',
            padding: 'var(--space-0-5) var(--space-2)',
            backgroundColor: 'var(--color-bg-subtle)',
            borderRadius: 'var(--radius-pill)',
          }}
        >
          React 18 · Vite 7 · Tailwind 3
        </span>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────────
   DEMO DATA — DataTable
   ───────────────────────────────────────────────────────────── */

const TABLE_COLUMNS = [
  { key: 'name', label: 'Nombre' },
  { key: 'role', label: 'Rol', render: (val) => <RoleBadge role={val} /> },
  { key: 'status', label: 'Estado', render: (val) => <StatusBadge status={val} /> },
  { key: 'email', label: 'Correo' },
]

const TABLE_DATA = [
  { id: 1, name: 'Ana García', role: 'admin', status: 'active', email: 'ana@example.com', active: true },
  { id: 2, name: 'Luis Martínez', role: 'researcher', status: 'active', email: 'luis@example.com', active: true },
  { id: 3, name: 'María López', role: 'aplicador', status: 'pending', email: 'maria@example.com', active: true },
  { id: 4, name: 'Carlos Ruiz', role: 'researcher', status: 'inactive', email: 'carlos@example.com', active: false },
]

/* ─────────────────────────────────────────────────────────────
   MAIN — GalleryPage
   ───────────────────────────────────────────────────────────── */

export default function GalleryPage() {
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState('button')
  const [modalOpen, setModalOpen] = useState(false)
  const [formValues, setFormValues] = useState({ username: '', email: '', password: '' })
  const [formError, setFormError] = useState('')
  const [activePill, setActivePill] = useState('todos')
  const { toasts, toast, dismiss } = useToast()

  function handleFormChange(field) {
    return (e) => setFormValues((prev) => ({ ...prev, [field]: e.target.value }))
  }

  function handleFormValidate() {
    if (!formValues.email.includes('@')) {
      setFormError('El correo electrónico no es válido.')
    } else {
      setFormError('')
    }
  }

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <GallerySidebar
        search={search}
        onSearch={setSearch}
        activeId={activeId}
        onNavigate={setActiveId}
      />

      {/* Main content */}
      <div className="app-content">
        <GalleryTopbar />

        <main className="page-container" style={{ maxWidth: '860px' }}>

          {/* ── SECTION: Button ── */}
          <ComponentSection
            id="button"
            title="Button"
            description="Botón de acción principal del DS. Soporta 5 variantes, 3 tamaños, estado loading y disabled."
            props={[
              { name: 'variant', type: "'primary'|'secondary'|'ghost'|'danger'|'icon'", default: "'primary'", desc: 'Variante visual del botón' },
              { name: 'size', type: "'sm'|'md'|'lg'", default: "'md'", desc: 'Tamaño del botón' },
              { name: 'loading', type: 'boolean', default: 'false', desc: 'Muestra spinner y deshabilita interacción' },
              { name: 'disabled', type: 'boolean', default: 'false', desc: 'Deshabilita el botón' },
              { name: 'icon', type: 'LucideIcon', default: '—', desc: 'Ícono de Lucide a mostrar' },
              { name: 'iconPosition', type: "'left'|'right'", default: "'left'", desc: 'Posición del ícono' },
            ]}
            code={`import { Button } from '@/components/app'

// Variante primaria
<Button variant="primary" onClick={handleSave}>
  Guardar cambios
</Button>

// Con ícono
<Button variant="secondary" icon={Plus} iconPosition="left">
  Nuevo registro
</Button>

// Estado loading
<Button variant="primary" loading>
  Guardando...
</Button>`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Variants */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>Variantes</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="icon" icon={Trash2} aria-label="Eliminar" />
                </div>
              </div>

              {/* Sizes */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>Tamaños</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>

              {/* States */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>Estados</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
                  <Button variant="primary" loading>Cargando...</Button>
                  <Button variant="primary" disabled>Deshabilitado</Button>
                  <Button variant="primary" icon={Plus}>Con ícono</Button>
                  <Button variant="primary" icon={Plus} iconPosition="right">Ícono derecha</Button>
                </div>
              </div>
            </div>
          </ComponentSection>

          {/* ── SECTION: PillToggle ── */}
          <ComponentSection
            id="pill-toggle"
            title="PillToggle"
            description="Botón de selección tipo pill para grupos de filtros mutuamente excluyentes. Comunica el estado activo con aria-pressed."
            props={[
              { name: 'selected', type: 'boolean', default: 'false', desc: 'Marca el pill como activo (cambia color y aria-pressed)' },
              { name: 'disabled', type: 'boolean', default: 'false', desc: 'Deshabilita el botón' },
              { name: 'children', type: 'ReactNode', default: '—', desc: 'Etiqueta visible del pill' },
              { name: '...props', type: 'HTMLButtonElement', default: '—', desc: 'Props nativas del botón (onClick, etc.)' },
            ]}
            code={`import { PillToggle } from '@/components/app'
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
}`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {/* Interactive demo */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Demo interactivo — haz clic para cambiar la selección
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {[
                    { value: 'todos', label: 'Todos' },
                    { value: 'active', label: 'Activos' },
                    { value: 'inactive', label: 'Inactivos' },
                  ].map(({ value, label }) => (
                    <PillToggle
                      key={label}
                      selected={activePill === value}
                      onClick={() => setActivePill(value)}
                    >
                      {label}
                    </PillToggle>
                  ))}
                </div>
              </div>
              {/* States */}
              <div>
                <p style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-2)' }}>
                  Estados
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <PillToggle selected={false}>Sin selección</PillToggle>
                  <PillToggle selected>Seleccionado</PillToggle>
                  <PillToggle disabled>Deshabilitado</PillToggle>
                </div>
              </div>
            </div>
          </ComponentSection>

          {/* ── SECTION: Typography ── */}
          <ComponentSection
            id="typography"
            title="Typography"
            description="Sistema tipográfico completo. Renderiza el elemento HTML semántico correcto con los tokens exactos del DS."
            props={[
              { name: 'as', type: "'display'|'h1'|'h2'|'h3'|'body'|'small'|'caption'|'label'|'code'", default: "'body'", desc: 'Variante tipográfica' },
              { name: 'children', type: 'ReactNode', default: '—', desc: 'Contenido' },
              { name: 'className', type: 'string', default: "''", desc: 'Clases adicionales' },
            ]}
            code={`import { Typography } from '@/components/app'

<Typography as="display">Título de bienvenida</Typography>
<Typography as="h1">Heading 1</Typography>
<Typography as="body">Párrafo de cuerpo</Typography>
<Typography as="label">Etiqueta de campo</Typography>
<Typography as="code">const x = 42</Typography>`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Typography as="display">Display — 28px medium</Typography>
              <Typography as="h1">Heading 1 — 22px medium</Typography>
              <Typography as="h2">Heading 2 — 18px medium</Typography>
              <Typography as="h3">Heading 3 — 16px medium</Typography>
              <Typography as="body">Body — 16px regular · El texto de cuerpo fluye con line-height 1.5 para máxima legibilidad.</Typography>
              <Typography as="small">Small — 14px regular</Typography>
              <Typography as="caption">Caption — 13px secondary</Typography>
              <Typography as="label">Label — 11px medium uppercase</Typography>
              <Typography as="code">{'const value = \'code · 13px mono\''}</Typography>
            </div>
          </ComponentSection>

          {/* ── SECTION: Spinner ── */}
          <ComponentSection
            id="spinner"
            title="Spinner"
            description="Indicador de carga animado basado en el ícono Loader2 de Lucide."
            props={[
              { name: 'size', type: '16|20|24', default: '16', desc: 'Tamaño en píxeles' },
              { name: 'color', type: "'primary'|'current'", default: "'primary'", desc: 'Color del spinner' },
            ]}
            code={`import { Spinner } from '@/components/app'

<Spinner size={16} color="primary" />
<Spinner size={20} />
<Spinner size={24} color="current" />`}
          >
            <div style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Spinner size={16} />
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>16px</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Spinner size={20} />
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>20px</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Spinner size={24} />
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>24px</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Spinner size={20} color="current" />
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>current</p>
              </div>
            </div>
          </ComponentSection>

          {/* ── SECTION: RoleBadge ── */}
          <ComponentSection
            id="role-badge"
            title="RoleBadge"
            description="Badge de rol de usuario con colores semánticos por tipo de rol."
            props={[
              { name: 'role', type: "'admin'|'researcher'|'aplicador'", default: '—', desc: 'Rol del usuario' },
            ]}
            code={`import { RoleBadge } from '@/components/app'

<RoleBadge role="admin" />
<RoleBadge role="researcher" />
<RoleBadge role="aplicador" />`}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <RoleBadge role="admin" />
              <RoleBadge role="researcher" />
              <RoleBadge role="aplicador" />
            </div>
          </ComponentSection>

          {/* ── SECTION: StatusBadge ── */}
          <ComponentSection
            id="status-badge"
            title="StatusBadge"
            description="Badge de estado de registro con colores semánticos."
            props={[
              { name: 'status', type: "'active'|'inactive'|'pending'", default: '—', desc: 'Estado del registro' },
            ]}
            code={`import { StatusBadge } from '@/components/app'

<StatusBadge status="active" />
<StatusBadge status="inactive" />
<StatusBadge status="pending" />`}
          >
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
              <StatusBadge status="active" />
              <StatusBadge status="inactive" />
              <StatusBadge status="pending" />
            </div>
          </ComponentSection>

          {/* ── SECTION: FormField ── */}
          <ComponentSection
            id="form-field"
            title="FormField"
            description="Campo de formulario completo: label + input + helper/error. Accesible con aria-invalid y aria-describedby."
            props={[
              { name: 'id', type: 'string', default: '—', desc: 'ID del campo (requerido para accesibilidad)' },
              { name: 'label', type: 'string', default: '—', desc: 'Etiqueta del campo' },
              { name: 'type', type: 'string', default: "'text'", desc: 'Tipo de input HTML' },
              { name: 'error', type: 'string', default: '—', desc: 'Mensaje de error (activa estado de error)' },
              { name: 'helper', type: 'string', default: '—', desc: 'Texto de ayuda (se oculta si hay error)' },
              { name: 'required', type: 'boolean', default: 'false', desc: 'Marca el campo como requerido' },
              { name: 'disabled', type: 'boolean', default: 'false', desc: 'Deshabilita el campo' },
            ]}
            code={`import { FormField } from '@/components/app'

// Default
<FormField id="name" label="Nombre completo" />

// Con helper
<FormField
  id="email"
  label="Correo electrónico"
  type="email"
  helper="Usa tu correo institucional"
/>

// Con error
<FormField
  id="password"
  label="Contraseña"
  type="password"
  error="La contraseña debe tener al menos 8 caracteres"
  required
/>`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: '400px' }}>
              <FormField
                id="demo-default"
                label="Estado default"
                placeholder="Escribe algo..."
                value={formValues.username}
                onChange={handleFormChange('username')}
              />
              <FormField
                id="demo-helper"
                label="Con helper text"
                type="email"
                helper="Usa tu correo institucional (ej: usuario@institucion.edu)"
                placeholder="correo@ejemplo.com"
                value={formValues.email}
                onChange={handleFormChange('email')}
                onBlur={handleFormValidate}
              />
              <FormField
                id="demo-error"
                label="Con error"
                type="password"
                error={formError || 'La contraseña debe tener al menos 8 caracteres'}
                required
                placeholder="Mínimo 8 caracteres"
                value={formValues.password}
                onChange={handleFormChange('password')}
              />
              <FormField
                id="demo-disabled"
                label="Deshabilitado"
                placeholder="No editable"
                disabled
                value="Valor no editable"
                onChange={() => {}}
              />
            </div>
          </ComponentSection>

          {/* ── SECTION: Alert ── */}
          <ComponentSection
            id="alert"
            title="Alert"
            description="Alerta estática inline. Ideal para mensajes de contexto dentro de la página."
            props={[
              { name: 'variant', type: "'info'|'success'|'warning'|'error'", default: "'info'", desc: 'Variante visual del alert' },
              { name: 'title', type: 'string', default: '—', desc: 'Título del alert' },
              { name: 'children', type: 'ReactNode', default: '—', desc: 'Contenido del cuerpo' },
              { name: 'icon', type: 'LucideIcon', default: '—', desc: 'Ícono personalizado (override)' },
            ]}
            code={`import { Alert } from '@/components/app'

<Alert variant="info" title="Información">
  Esta acción enviará una notificación a todos los usuarios.
</Alert>

<Alert variant="success" title="Cambios guardados">
  Tu perfil se actualizó correctamente.
</Alert>

<Alert variant="warning" title="Atención requerida">
  Este registro tiene campos incompletos.
</Alert>

<Alert variant="error" title="Error de validación">
  El correo electrónico ya está registrado.
</Alert>`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <Alert variant="info" title="Información">
                Esta acción enviará una notificación a todos los usuarios.
              </Alert>
              <Alert variant="success" title="Cambios guardados">
                Tu perfil se actualizó correctamente.
              </Alert>
              <Alert variant="warning" title="Atención requerida">
                Este registro tiene campos incompletos. Por favor revisa los datos antes de continuar.
              </Alert>
              <Alert variant="error" title="Error de validación">
                El correo electrónico ya está registrado en el sistema.
              </Alert>
            </div>
          </ComponentSection>

          {/* ── SECTION: Toast ── */}
          <ComponentSection
            id="toast"
            title="Toast"
            description="Sistema de notificaciones transitorias. Los errores no tienen auto-dismiss. Usa el hook useToast para disparar toasts."
            props={[
              { name: 'type', type: "'success'|'error'|'warning'|'info'", default: "'info'", desc: 'Tipo de toast' },
              { name: 'title', type: 'string', default: '—', desc: 'Título' },
              { name: 'message', type: 'string', default: '—', desc: 'Mensaje descriptivo' },
              { name: 'duration', type: 'number', default: '4000', desc: 'Duración en ms. 0 = no auto-dismiss' },
            ]}
            code={`import { ToastContainer } from '@/components/app'
import { useToast } from '@/components/app/useToast'

function MyPage() {
  const { toasts, toast, dismiss } = useToast()

  return (
    <>
      <Button onClick={() => toast({ type: 'success', title: 'Guardado', message: 'Los cambios se aplicaron.' })}>
        Mostrar toast
      </Button>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  )
}`}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
              <Button
                variant="secondary"
                onClick={() => toast({ type: 'success', title: 'Éxito', message: 'Los cambios se guardaron correctamente.' })}
              >
                Toast Success
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast({ type: 'info', title: 'Información', message: 'Hay una nueva versión disponible.' })}
              >
                Toast Info
              </Button>
              <Button
                variant="ghost"
                onClick={() => toast({ type: 'warning', title: 'Advertencia', message: 'Algunos campos están incompletos.' })}
              >
                Toast Warning
              </Button>
              <Button
                variant="danger"
                onClick={() => toast({ type: 'error', title: 'Error', message: 'No se pudo conectar con el servidor. Este toast no desaparece automáticamente.' })}
              >
                Toast Error
              </Button>
            </div>
          </ComponentSection>

          {/* ── SECTION: Modal ── */}
          <ComponentSection
            id="modal"
            title="Modal"
            description="Diálogo modal con overlay, header, body y footer opcional. Cierra con Esc, clic en overlay o botón X."
            props={[
              { name: 'open', type: 'boolean', default: '—', desc: 'Controla la visibilidad del modal' },
              { name: 'onClose', type: 'function', default: '—', desc: 'Callback al cerrar' },
              { name: 'title', type: 'string', default: '—', desc: 'Título del modal' },
              { name: 'children', type: 'ReactNode', default: '—', desc: 'Contenido del cuerpo' },
              { name: 'footer', type: 'ReactNode', default: '—', desc: 'Contenido del footer (botones de acción)' },
              { name: 'size', type: "'sm'|'md'|'lg'", default: "'md'", desc: 'Tamaño máximo del modal' },
            ]}
            code={`import { Modal, Button } from '@/components/app'

const [open, setOpen] = useState(false)

<Button onClick={() => setOpen(true)}>Abrir modal</Button>

<Modal
  open={open}
  onClose={() => setOpen(false)}
  title="Confirmar acción"
  footer={
    <>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button variant="primary" onClick={handleConfirm}>Confirmar</Button>
    </>
  }
>
  <p>¿Estás seguro de que deseas continuar?</p>
</Modal>`}
          >
            <div>
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Abrir modal de ejemplo
              </Button>

              <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Ejemplo de modal"
                footer={
                  <>
                    <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={() => { setModalOpen(false); toast({ type: 'success', title: 'Acción confirmada' }) }}>
                      Confirmar
                    </Button>
                  </>
                }
              >
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)', marginBottom: 'var(--space-4)' }}>
                  Este es un modal de demostración. Puedes cerrarlo haciendo clic en &quot;Cancelar&quot;,
                  en el botón X, o presionando la tecla Escape.
                </p>
                <Alert variant="info">
                  El modal usa un portal de React para renderizarse fuera del árbol DOM del componente.
                </Alert>
              </Modal>
            </div>
          </ComponentSection>

          {/* ── SECTION: DataTable ── */}
          <ComponentSection
            id="data-table"
            title="DataTable"
            description="Tabla de datos con skeleton de carga, estado vacío y soporte para filas inactivas."
            props={[
              { name: 'columns', type: 'Array<{key, label, render?}>', default: '[]', desc: 'Definición de columnas' },
              { name: 'data', type: 'Array<object>', default: '[]', desc: 'Filas de datos' },
              { name: 'loading', type: 'boolean', default: 'false', desc: 'Muestra skeleton de carga' },
              { name: 'emptyMessage', type: 'string', default: "'No hay datos disponibles'", desc: 'Mensaje cuando no hay filas' },
            ]}
            code={`import { DataTable, RoleBadge, StatusBadge } from '@/components/app'

const columns = [
  { key: 'name', label: 'Nombre' },
  { key: 'role', label: 'Rol', render: (val) => <RoleBadge role={val} /> },
  { key: 'status', label: 'Estado', render: (val) => <StatusBadge status={val} /> },
]

// Filas con active=false se muestran en rojo/inactivo
const data = [
  { id: 1, name: 'Ana García', role: 'admin', status: 'active', active: true },
  { id: 2, name: 'Carlos Ruiz', role: 'researcher', status: 'inactive', active: false },
]

<DataTable columns={columns} data={data} />`}
          >
            <DataTable columns={TABLE_COLUMNS} data={TABLE_DATA} />
          </ComponentSection>

          {/* ── SECTION: EmptyState ── */}
          <ComponentSection
            id="empty-state"
            title="EmptyState"
            description="Estado vacío para secciones sin datos. Soporta ícono personalizado y acción CTA."
            props={[
              { name: 'icon', type: 'LucideIcon', default: 'Database', desc: 'Ícono principal' },
              { name: 'title', type: 'string', default: '—', desc: 'Título' },
              { name: 'message', type: 'string', default: '—', desc: 'Descripción del estado vacío' },
              { name: 'action', type: 'ReactNode', default: '—', desc: 'CTA o botón de acción' },
            ]}
            code={`import { EmptyState, Button } from '@/components/app'
import { Users } from 'lucide-react'

// Sin CTA
<EmptyState
  icon={Users}
  title="Sin usuarios"
  message="No hay usuarios registrados en el sistema todavía."
/>

// Con CTA
<EmptyState
  icon={FileText}
  title="Sin perfiles"
  message="Crea el primer perfil lingüístico para comenzar."
  action={<Button variant="primary" icon={Plus}>Crear perfil</Button>}
/>`}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                <EmptyState
                  icon={Users}
                  title="Sin usuarios"
                  message="No hay usuarios registrados en el sistema todavía."
                />
              </div>
              <div
                style={{
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                }}
              >
                <EmptyState
                  icon={FileText}
                  title="Sin perfiles lingüísticos"
                  message="Crea el primer perfil lingüístico para comenzar a registrar evaluaciones."
                  action={
                    <Button variant="primary" icon={Plus}>
                      Crear primer perfil
                    </Button>
                  }
                />
              </div>
            </div>
          </ComponentSection>

        </main>
      </div>

      {/* Toast container — must be outside scroll container */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
