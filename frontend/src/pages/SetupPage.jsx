import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { Button, FormField, Alert } from '@/components/app'
import { validarSetupToken, completarSetup } from '@/services/setup'

/**
 * SetupPage — Configuración inicial de contraseña
 *
 * Ruta pública: /setup?token=...
 * El usuario llega aquí desde el enlace de configuración que le envió el administrador.
 * Establece su propia contraseña y queda habilitado para iniciar sesión.
 */
function SetupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  // 'cargando' | 'formulario' | 'error' | 'exito'
  const [estado, setEstado] = useState('cargando')
  const [infoUsuario, setInfoUsuario] = useState(null) // { email, full_name }
  const [errorToken, setErrorToken] = useState('')

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errores, setErrores] = useState({})
  const [errorApi, setErrorApi] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrorToken('Enlace de configuración inválido. Solicita uno nuevo al administrador.')
      setEstado('error')
      return
    }

    validarSetupToken(token)
      .then((data) => {
        if (data.status === 'success') {
          setInfoUsuario(data.data)
          setEstado('formulario')
        } else {
          setErrorToken(data.message || 'El enlace es inválido o ha expirado.')
          setEstado('error')
        }
      })
      .catch(() => {
        setErrorToken('No se pudo verificar el enlace. Intenta más tarde.')
        setEstado('error')
      })
  }, [token])

  function handleChange(campo) {
    return (e) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
      if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: '' }))
      if (errorApi) setErrorApi('')
    }
  }

  function validar() {
    const errs = {}
    if (!form.password.trim()) {
      errs.password = 'La contraseña es obligatoria.'
    } else if (form.password.length < 8) {
      errs.password = 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (!form.confirm.trim()) {
      errs.confirm = 'Confirma tu contraseña.'
    } else if (form.password !== form.confirm) {
      errs.confirm = 'Las contraseñas no coinciden.'
    }
    setErrores(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit() {
    if (!validar()) return
    setGuardando(true)
    setErrorApi('')

    try {
      const data = await completarSetup(token, form.password)
      if (data.status === 'success') {
        setEstado('exito')
        setTimeout(() => navigate('/login'), 3000)
      } else {
        setErrorApi(data.message || 'No se pudo configurar la contraseña.')
      }
    } catch {
      setErrorApi('Error de conexión. Intenta nuevamente.')
    } finally {
      setGuardando(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="login-layout">
      <div className="login-card">

        {/* Ícono + título */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-3)',
            marginBottom: 'var(--space-8)',
          }}
        >
          <div
            style={{
              width: 'var(--input-height)',
              height: 'var(--input-height)',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary-dark)',
            }}
          >
            <KeyRound size={24} aria-hidden="true" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontSize: 'var(--font-size-h2)',
                fontWeight: 'var(--font-weight-medium)',
                color: 'var(--color-text-primary)',
              }}
            >
              Configura tu contraseña
            </h1>
            {infoUsuario && (
              <p
                style={{
                  fontSize: 'var(--font-size-small)',
                  color: 'var(--color-text-secondary)',
                  marginTop: 'var(--space-1)',
                }}
              >
                Bienvenido, <strong>{infoUsuario.full_name}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Estado: cargando */}
        {estado === 'cargando' && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-small)' }}>
            Verificando enlace…
          </p>
        )}

        {/* Estado: error de token */}
        {estado === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Alert variant="error">{errorToken}</Alert>
            <p style={{ fontSize: 'var(--font-size-small)', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              Contacta al administrador para que genere un nuevo enlace.
            </p>
          </div>
        )}

        {/* Estado: formulario */}
        {estado === 'formulario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {errorApi && <Alert variant="error">{errorApi}</Alert>}

            <FormField
              id="setup-password"
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              value={form.password}
              onChange={handleChange('password')}
              onKeyDown={handleKeyDown}
              error={errores.password}
              autoFocus
            />

            <FormField
              id="setup-confirm"
              label="Confirmar contraseña"
              type="password"
              placeholder="Repite la contraseña"
              required
              value={form.confirm}
              onChange={handleChange('confirm')}
              onKeyDown={handleKeyDown}
              error={errores.confirm}
            />

            <Button
              icon={KeyRound}
              iconPosition="right"
              onClick={handleSubmit}
              loading={guardando}
              style={{ width: '100%' }}
            >
              Crear contraseña
            </Button>
          </div>
        )}

        {/* Estado: éxito */}
        {estado === 'exito' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', textAlign: 'center' }}>
            <Alert variant="success">
              Contraseña creada correctamente. Redirigiendo al inicio de sesión…
            </Alert>
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Ir al inicio de sesión
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}

export default SetupPage
