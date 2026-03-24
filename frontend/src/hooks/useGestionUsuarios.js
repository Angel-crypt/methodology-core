import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/components/app'
import { listarUsuarios, crearUsuario, cambiarEstadoUsuario } from '@/services/users'

export const FILTROS_ESTADO = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activos' },
  { value: 'false', label: 'Inactivos' },
]

export const FORM_INICIAL = { full_name: '', email: '', password: '' }

export function formatFecha(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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

  // ─── Estado formulario crear ───────────────────────────────────
  const [formCrear, setFormCrear] = useState(FORM_INICIAL)
  const [erroresCrear, setErroresCrear] = useState({})
  const [errorApiCrear, setErrorApiCrear] = useState('')
  const [guardandoCrear, setGuardandoCrear] = useState(false)

  // ─── Estado cambio de estado ───────────────────────────────────
  const [errorApiEstado, setErrorApiEstado] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  const { toasts, toast, dismiss } = useToast()

  // ─── Carga de datos ────────────────────────────────────────────
  const cargarUsuarios = useCallback(async () => {
    setCargando(true)
    try {
      const data = await listarUsuarios(token, role, filtroEstado)
      if (data.status === 'success') {
        setUsuarios(data.data)
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
    if (!formCrear.password.trim()) errs.password = 'La contraseña es obligatoria.'
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
        password: formCrear.password,
        role,
      })
      if (data.status === 'success') {
        setModalCrear(false)
        const label = labelSingular.charAt(0).toUpperCase() + labelSingular.slice(1)
        toast({
          type: 'success',
          title: `${label} creado`,
          message: `${formCrear.full_name.trim()} fue registrado correctamente.`,
        })
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
    formCrear,
    erroresCrear,
    errorApiCrear,
    guardandoCrear,
    errorApiEstado,
    guardandoEstado,
    toasts,
    toast,
    dismiss,
    abrirModalCrear,
    handleChangeCrear,
    handleGuardarCrear,
    abrirModalEstado,
    handleConfirmarEstado,
  }
}
