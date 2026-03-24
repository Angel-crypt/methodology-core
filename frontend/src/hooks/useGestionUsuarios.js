import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/app'
import { listarUsuarios, crearUsuario, cambiarEstadoUsuario, resetearPassword } from '@/services/users'

export const FILTROS_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'false', label: 'Inactivos' },
]

export const FORM_INICIAL = { full_name: '', email: '' }

export function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Deriva el estado de un usuario a partir de sus campos booleanos.
 * pending  → active=true  AND must_change_password=true
 * active   → active=true  AND must_change_password=false
 * inactive → active=false
 */
export function getUserStatus(user) {
  if (!user.active) return 'inactive'
  if (user.must_change_password) return 'pending'
  return 'active'
}

/**
 * useGestionUsuarios
 * Encapsula todo el estado y los handlers compartidos por
 * GestionAplicadores y GestionInvestigadores.
 *
 * @param {{ token: string, role: string, labelSingular: string }} params
 *   labelSingular — ej. 'aplicador' o 'investigador' (para mensajes de UI)
 */
export function useGestionUsuarios({ token, role, labelSingular }) {
  // ─── Rol del usuario desde el JWT ─────────────────────────────
  const esAdmin = (() => {
    try {
      return JSON.parse(atob(token.split('.')[1])).role === 'administrator'
    } catch {
      return false
    }
  })()

  // ─── Estado principal ──────────────────────────────────────────
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')

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

  // ─── Estado cambio de estado ───────────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  // ─── Estado reset contraseña ───────────────────────────────────
  const [guardandoReset, setGuardandoReset] = useState(false)

  // ─── Estado drawer detalle ─────────────────────────────────────
  const [drawerUsuario, setDrawerUsuario] = useState(null)

  function abrirDetalle(usuario) { setDrawerUsuario(usuario) }
  function cerrarDetalle()       { setDrawerUsuario(null) }

  const { toasts, toast, dismiss } = useToast()

  // ─── Carga de datos ────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setCargando(true)
    try {
      // El filtro 'pending' y 'true' (activos reales) requieren cargar
      // los usuarios con active=true y filtrar cliente-side por must_change_password.
      // El filtro 'false' (inactivos) usa el parámetro del API directamente.
      const apiActiveFilter =
        filtroEstado === 'pending' ? 'true'
        : filtroEstado === 'true' ? 'true'
        : filtroEstado === 'false' ? 'false'
        : ''

      const data = await listarUsuarios(token, role, apiActiveFilter)
      if (data.status === 'success') {
        let lista = data.data
        // Filtrado cliente-side para distinguir pending de active
        if (filtroEstado === 'pending') {
          lista = lista.filter((u) => u.must_change_password)
        } else if (filtroEstado === 'true') {
          lista = lista.filter((u) => !u.must_change_password)
        }
        setUsuarios(lista)
      } else {
        toast({ type: 'error', title: 'Error', message: data.message || 'No se pudo cargar la lista.' })
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
    setModalCrear(true)
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
    setErroresCrear(errs)
    return Object.keys(errs).length === 0
  }

  async function handleGuardarCrear() {
    if (!validarFormCrear()) return
    setGuardandoCrear(true)
    setErrorApiCrear('')

    try {
      const data = await crearUsuario(token, {
        full_name: formCrear.full_name.trim(),
        email: formCrear.email.trim(),
        role,
      })
      if (data.status === 'success') {
        setModalCrear(false)
        setFormCrear(FORM_INICIAL)
        // Mostrar setup link al admin una sola vez (TTL 24h, single-use)
        setCredencialesNuevas({
          email: data.data.email,
          setupToken: data.data._mock_setup_token,
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
        // Mostrar setup link al admin (TTL 24h, single-use)
        setCredencialesNuevas({
          email: usuario.email,
          setupToken: data.data._mock_setup_token,
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
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
    handleResetearPassword,
    drawerUsuario,
    abrirDetalle,
    cerrarDetalle,
  }
}
