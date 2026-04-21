import { useState, useCallback, useEffect, useMemo } from 'react'
import { useToast } from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import { listarUsuarios, crearUsuario, cambiarEstadoUsuario, resetearPassword, listarTodasLasSesiones } from '@/services/users'
import { aprobarCambioCorreo } from '@/services/emailChangeRequests'

export const FILTROS_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

export const FORM_INICIAL = { full_name: '', email: '', institution: '' }

export function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Deriva el estado de un usuario a partir de sus campos.
 * - disabled: cuenta desactivada por admin
 * - pending: debe cambiar contraseña (superadmin con must_change_password)
 * - active: cuenta activa (ya sea por magic link o por OIDC)
 *
 * El campo oidc_linked indica si el usuario bindeó OIDC,
 * no si la cuenta está activa.
 */
export function getUserStatus(user) {
  if (!user.active) return 'disabled'
  if (user.must_change_password) return 'pending'
  return 'active'
}

/**
 * useGestionUsuarios
 * Encapsula todo el estado y los handlers compartidos por
 * GestionAplicadores y GestionInvestigadores.
 *
 * @param {{ role: string, labelSingular: string }} params
 *   labelSingular — ej. 'aplicador' o 'investigador' (para mensajes de UI)
 */
export function useGestionUsuarios({ role, labelSingular }) {
  const { token, role: authRole } = useAuth()
  const esAdmin = authRole === 'superadmin'

  // ─── Estado principal ──────────────────────────────────────────
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [usuariosConSesion, setUsuariosConSesion] = useState(new Set())

  // ─── Estado modales ────────────────────────────────────────────
  const [modalCrear, setModalCrear] = useState(false)
  const [modalEstado, setModalEstado] = useState(false)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)

  // ─── Estado modal credenciales ─────────────────────────────────
  const [modalCredenciales, setModalCredenciales] = useState(false)
  const [credencialesNuevas, setCredencialesNuevas] = useState(null) // { email, setupToken, nombreUsuario }

  // ─── Estado formulario crear ───────────────────────────────────
  const [formCrear, setFormCrear] = useState(FORM_INICIAL)
  const [erroresCrear, setErroresCrear] = useState({})
  const [errorApiCrear, setErrorApiCrear] = useState('')
  const [guardandoCrear, setGuardandoCrear] = useState(false)
  const [institutionDetected, setInstitutionDetected] = useState(null) // string | null
  const [emailDomainError, setEmailDomainError] = useState('') // error de dominio no registrado

  // ─── Estado cambio de estado ───────────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  // ─── Estado reset contraseña ───────────────────────────────────
  const [guardandoReset, setGuardandoReset] = useState(false)

  // ─── Estado cambiar correo ────────────────────────────────────
  const [modalCambiarCorreo, setModalCambiarCorreo] = useState(false)
  const [nuevoCorreo, setNuevoCorreo] = useState('')
  const [errorCambioCorreo, setErrorCambioCorreo] = useState('')
  const [guardandoCambioCorreo, setGuardandoCambioCorreo] = useState(false)

  // ─── Búsqueda por página ───────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('')

  const usuariosFiltrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    )
  }, [usuarios, searchQuery])

  // ─── Estado drawer detalle ─────────────────────────────────────
  const [drawerUsuario, setDrawerUsuario] = useState(null)

  function abrirDetalle(usuario) { setDrawerUsuario(usuario) }
  function cerrarDetalle()       { setDrawerUsuario(null) }

  const { toasts, toast, dismiss } = useToast()

  // ─── Carga de datos ────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setCargando(true)
    try {
      const apiActiveFilter =
        filtroEstado === 'true'  ? 'true'
        : filtroEstado === 'false' ? 'false'
        : ''

      const [data, sesionesData] = await Promise.all([
        listarUsuarios(token, role, apiActiveFilter),
        listarTodasLasSesiones(token),
      ])

      if (data.status === 'success') {
        setUsuarios(data.data)
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo cargar la lista.' })
      }

      if (sesionesData.status === 'success') {
        setUsuariosConSesion(new Set(sesionesData.data.map((s) => s.user_id)))
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setCargando(false)
    }
  }, [token, role, filtroEstado, toast])

  useEffect(() => {
    cargarUsuarios()
  }, [cargarUsuarios])

  // ─── Handlers — Modal Crear ────────────────────────────────────
  function abrirModalCrear() {
    setFormCrear(FORM_INICIAL)
    setErroresCrear({})
    setErrorApiCrear('')
    setInstitutionDetected(null)
    setModalCrear(true)
  }

  async function handleEmailBlur() {
    const email = formCrear.email.trim()
    if (!email || !email.includes('@')) return
    setInstitutionDetected(null)
    setEmailDomainError('')
    try {
      const res = await fetch(`/api/v1/institutions/resolve?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        const detected = json.data?.institution ?? null
        setInstitutionDetected(detected)
        if (!detected) {
          // Institution no registrada en el sistema — error de dominio
          const domain = email.split('@')[1]
          setEmailDomainError(`El dominio "${domain}" no está registrado. Solicita registro ante el administrador.`)
        }
        if (detected && !formCrear.institution) {
          setFormCrear((prev) => ({ ...prev, institution: detected }))
        }
      }
    } catch {
      // no op — institution detection is best-effort
    }
  }

  function handleChangeCrear(campo) {
    return (e) => {
      setFormCrear((prev) => ({ ...prev, [campo]: e.target.value }))
      if (erroresCrear[campo]) setErroresCrear((prev) => ({ ...prev, [campo]: '' }))
      if (errorApiCrear) setErrorApiCrear('')
    }
  }

  function validarFormCrear() {
    const errs = {}
    if (!formCrear.full_name.trim()) errs.full_name = 'El nombre es obligatorio.'
    if (!formCrear.email.trim()) errs.email = 'El correo es obligatorio.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formCrear.email.trim())) {
      errs.email = 'El correo debe tener una estructura válida (ej. usuario@dominio.com).'
    }
    setErroresCrear(errs)
    return Object.keys(errs).length === 0
  }

  async function handleGuardarCrear() {
    if (!validarFormCrear()) return
    setGuardandoCrear(true)
    setErrorApiCrear('')

    try {
      const payload = {
        full_name: formCrear.full_name.trim(),
        email: formCrear.email.trim(),
        role,
      }
      if (formCrear.institution.trim()) payload.institution = formCrear.institution.trim()
      const data = await crearUsuario(token, payload)
      if (data.status === 'success') {
        setModalCrear(false)
        setFormCrear(FORM_INICIAL)
        // Mostrar magic link al admin una sola vez (TTL 24h, single-use)
        setCredencialesNuevas({
          email: data.data.email,
          magicLink: data.data._mock_magic_link,
          nombreUsuario: data.data.full_name,
        })
        setModalCredenciales(true)
        cargarUsuarios()
      } else {
        setErrorApiCrear(data.message || `No se pudo crear el ${labelSingular}.`)
      }
    } catch {
      setErrorApiCrear('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoCrear(false)
    }
  }

  function cerrarModalCredenciales() {
    setModalCredenciales(false)
    setCredencialesNuevas(null)
    const label = labelSingular.charAt(0).toUpperCase() + labelSingular.slice(1)
    toast({
      type: 'success',
      title: `${label} creado`,
      message: `La cuenta fue registrada. El usuario deberá cambiar su contraseña al primer acceso.`,
    })
  }

  // ─── Handlers — Modal Estado ───────────────────────────────────
  function abrirModalEstado(usuario) {
    setUsuarioSeleccionado(usuario)
    setErrorApiEstado('')
    setModalEstado(true)
  }

  async function handleConfirmarEstado() {
    if (!usuarioSeleccionado) return
    setGuardandoEstado(true)
    setErrorApiEstado('')
    const nuevoEstado = !usuarioSeleccionado.active
    try {
      const data = await cambiarEstadoUsuario(token, usuarioSeleccionado.id, nuevoEstado)
      if (data.status === 'success') {
        setModalEstado(false)
        const accion = nuevoEstado ? 'activado' : 'desactivado'
        toast({
          type: 'success',
          title: 'Estado actualizado',
          message: `${usuarioSeleccionado.full_name} fue ${accion}.`,
        })
        cargarUsuarios()
      } else {
        setErrorApiEstado(data.message || 'No se pudo cambiar el estado.')
      }
    } catch {
      setErrorApiEstado('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoEstado(false)
    }
  }

  // ─── Handlers — Reset contraseña ──────────────────────────────
  async function handleResetearPassword(usuario) {
    setGuardandoReset(true)
    try {
      const data = await resetearPassword(token, usuario.id)
      if (data.status === 'success') {
        // Mostrar magic link al admin (TTL 24h, single-use)
        setCredencialesNuevas({
          email: usuario.email,
          magicLink: data.data._mock_magic_link,
          nombreUsuario: usuario.full_name,
        })
        setModalCredenciales(true)
        cargarUsuarios()
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo restablecer la contraseña.' })
      }
    } catch {
      toast({ type: 'error', title: 'Error de red', message: 'No se pudo conectar con el servidor.' })
    } finally {
      setGuardandoReset(false)
    }
  }

  // ─── Handlers — Cambiar correo ────────────────────────────────
  function abrirModalCambiarCorreo(usuario) {
    setUsuarioSeleccionado(usuario)
    setNuevoCorreo('')
    setErrorCambioCorreo('')
    setModalCambiarCorreo(true)
  }

  async function handleGuardarCambiarCorreo() {
    const email = nuevoCorreo.trim()
    if (!email) { setErrorCambioCorreo('El correo es obligatorio.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorCambioCorreo('Formato de correo inválido.'); return }
    setGuardandoCambioCorreo(true)
    setErrorCambioCorreo('')
    try {
      const data = await aprobarCambioCorreo(token, usuarioSeleccionado.id, email)
      if (data.status === 'success') {
        setModalCambiarCorreo(false)
        toast({ type: 'success', title: 'Correo actualizado', message: 'El correo fue actualizado. El usuario fue desconectado.' })
        cargarUsuarios()
      } else {
        setErrorCambioCorreo(data.message || 'No se pudo actualizar el correo.')
      }
    } catch {
      setErrorCambioCorreo('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardandoCambioCorreo(false)
    }
  }

  return {
    esAdmin,
    usuarios,
    cargando,
    filtroEstado,
    setFiltroEstado,
    modalCrear,
    setModalCrear,
    modalEstado,
    setModalEstado,
    usuarioSeleccionado,
    modalCredenciales,
    credencialesNuevas,
    cerrarModalCredenciales,
    formCrear,
    erroresCrear,
    errorApiCrear,
    guardandoCrear,
    errorApiEstado,
    guardandoEstado,
    guardandoReset,
    toasts,
    toast,
    dismiss,
    abrirModalCrear,
    handleChangeCrear,
    handleEmailBlur,
    institutionDetected,
    emailDomainError,
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
    handleResetearPassword,
    modalCambiarCorreo,
    setModalCambiarCorreo,
    nuevoCorreo,
    setNuevoCorreo,
    errorCambioCorreo,
    guardandoCambioCorreo,
    abrirModalCambiarCorreo,
    handleGuardarCambiarCorreo,
    drawerUsuario,
    abrirDetalle,
    cerrarDetalle,
    searchQuery,
    setSearchQuery,
    usuariosFiltrados,
    usuariosConSesion,
  }
}
