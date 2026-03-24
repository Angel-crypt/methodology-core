import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, BookOpen, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import RoleBadge from './RoleBadge'
import StatusBadge from './StatusBadge'
import { listarTodosUsuarios } from '@/services/users'
import { listarInstrumentos } from '@/services/instruments'

/**
 * GlobalSearch
 * Búsqueda global accesible con Cmd+K / Ctrl+K.
 * Busca en usuarios (todos los roles) e instrumentos simultáneamente.
 * Incluye accesos rápidos para crear entidades.
 * Resultados agrupados por sección; clic navega al detalle.
 *
 * Props:
 *   token  string — JWT del usuario autenticado
 */

const ACCIONES = [
  {
    id: 'accion-nuevo-aplicador',
    label: 'Nuevo aplicador',
    descripcion: 'Crear cuenta de profesional aplicador',
    ruta: '/usuarios/aplicadores',
    state: { openCrear: true },
  },
  {
    id: 'accion-nuevo-investigador',
    label: 'Nuevo investigador',
    descripcion: 'Crear cuenta de investigador',
    ruta: '/usuarios/investigadores',
    state: { openCrear: true },
  },
  {
    id: 'accion-nuevo-instrumento',
    label: 'Nuevo instrumento',
    descripcion: 'Registrar instrumento metodológico',
    ruta: '/instruments',
    state: { openCrear: true },
  },
]

function GlobalSearch({ token }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [allInstruments, setAllInstruments] = useState([])
  const [cargando, setCargando] = useState(false)
  const [cargado, setCargado] = useState(false)

  // Cmd+K / Ctrl+K
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Carga inicial al abrir (una sola vez por sesión de búsqueda)
  useEffect(() => {
    if (!open || cargado) return
    setCargando(true)
    Promise.all([listarTodosUsuarios(token), listarInstrumentos(token)])
      .then(([usersData, instrData]) => {
        if (usersData.status === 'success') setAllUsers(usersData.data)
        if (instrData.status === 'success') setAllInstruments(instrData.data)
      })
      .finally(() => {
        setCargando(false)
        setCargado(true)
      })
  }, [open, cargado, token])

  function handleClose() {
    setOpen(false)
    setQuery('')
    setCargado(false)
    setAllUsers([])
    setAllInstruments([])
  }

  function handleSelectUser(user) {
    const ruta =
      user.role === 'applicator'
        ? '/usuarios/aplicadores'
        : '/usuarios/investigadores'
    navigate(ruta, { state: { openDrawer: user } })
    handleClose()
  }

  function handleSelectInstrumento(instr) {
    navigate('/instruments', { state: { openDrawer: instr } })
    handleClose()
  }

  function handleSelectAccion(accion) {
    navigate(accion.ruta, { state: accion.state })
    handleClose()
  }

  const q = query.trim().toLowerCase()

  const usuarios = q
    ? allUsers.filter(
        (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      )
    : allUsers

  const instrumentos = q
    ? allInstruments.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.methodological_description || '').toLowerCase().includes(q)
      )
    : allInstruments

  const acciones = q
    ? ACCIONES.filter(
        (a) => a.label.toLowerCase().includes(q) || a.descripcion.toLowerCase().includes(q)
      )
    : ACCIONES

  const sinResultados =
    !cargando &&
    usuarios.length === 0 &&
    instrumentos.length === 0 &&
    acciones.length === 0

  const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose() }}>
      <Dialog.Trigger asChild>
        <button className="search-trigger" aria-label="Abrir búsqueda global">
          <Search size={14} aria-hidden="true" />
          <span>Buscar...</span>
          <kbd>{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="search-overlay" />
        <Dialog.Content
          className="search-dialog"
          aria-describedby={undefined}
          onEscapeKeyDown={handleClose}
        >
          <Dialog.Title className="sr-only">Búsqueda global</Dialog.Title>

          <div className="search-input-wrapper">
            <Search size={16} aria-hidden="true" />
            <input
              className="search-input"
              placeholder="Buscar usuarios, instrumentos o acciones..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="search-results">
            {cargando && <p className="search-empty">Cargando...</p>}

            {sinResultados && (
              <p className="search-empty">
                {q ? `Sin resultados para "${query}"` : 'Sin datos registrados'}
              </p>
            )}

            {/* ── Usuarios ── */}
            {!cargando && usuarios.length > 0 && (
              <>
                <p className="search-section-label">Usuarios</p>
                {usuarios.map((user) => {
                  const status = !user.active
                    ? 'inactive'
                    : user.must_change_password
                      ? 'pending'
                      : 'active'
                  const roleKey =
                    user.role === 'administrator' ? 'admin'
                    : user.role === 'applicator' ? 'aplicador'
                    : 'researcher'
                  return (
                    <button
                      key={user.id}
                      className="search-result-item search-result-item--clickable"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div>
                        <span className="search-result-name">{user.full_name}</span>
                        <span className="search-result-meta">{user.email}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                        <RoleBadge role={roleKey} />
                        <StatusBadge status={status} />
                      </div>
                    </button>
                  )
                })}
              </>
            )}

            {/* ── Instrumentos ── */}
            {!cargando && instrumentos.length > 0 && (
              <>
                <p className="search-section-label">Instrumentos</p>
                {instrumentos.map((instr) => (
                  <button
                    key={instr.id}
                    className="search-result-item search-result-item--clickable"
                    onClick={() => handleSelectInstrumento(instr)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                      <BookOpen
                        size={14}
                        style={{ color: 'var(--color-text-tertiary)', marginTop: 2, flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <div>
                        <span className="search-result-name">{instr.name}</span>
                        {instr.methodological_description && (
                          <span className="search-result-meta">
                            {instr.methodological_description.length > 80
                              ? instr.methodological_description.slice(0, 80) + '…'
                              : instr.methodological_description}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={instr.status} />
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* ── Acciones ── */}
            {acciones.length > 0 && (
              <>
                <p className="search-section-label">Acciones</p>
                {acciones.map((accion) => (
                  <button
                    key={accion.id}
                    className="search-result-item search-result-item--clickable"
                    onClick={() => handleSelectAccion(accion)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Plus
                        size={14}
                        style={{ color: 'var(--color-text-tertiary)', flexShrink: 0 }}
                        aria-hidden="true"
                      />
                      <div>
                        <span className="search-result-name">{accion.label}</span>
                        <span className="search-result-meta">{accion.descripcion}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

GlobalSearch.propTypes = {
  token: PropTypes.string.isRequired,
}

export default GlobalSearch
