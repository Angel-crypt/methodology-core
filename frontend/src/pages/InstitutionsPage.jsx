/**
 * InstitutionsPage — administración de instituciones (solo superadmin).
 * Las instituciones son informativas — no afectan control de acceso.
 */
import { useState, useEffect, useCallback } from 'react'
import { Building2, Plus, Pencil } from 'lucide-react'
import {
  Button, Modal, FormField, Alert, DataTable, Typography,
  ToastContainer, useToast, EmptyState,
} from '@/components/app'
import { useAuth } from '@/contexts/AuthContext'
import { listarInstituciones, crearInstitucion, editarInstitucion } from '@/services/institutions'
import { APP_LOCALE } from '@/constants/locale'

export default function InstitutionsPage() {
  const { token } = useAuth()
  const { toasts, toast, dismiss } = useToast()

  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null) // { id, name, domain } | null

  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [nameError, setNameError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    listarInstituciones(token)
      .then((res) => { if (res.ok) setInstitutions(res.data ?? []) })
      .catch(() => toast({ type: 'error', title: 'Error', message: 'No se pudieron cargar las instituciones' }))
      .finally(() => setLoading(false))
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  function openModal() {
    setEditTarget(null)
    setName('')
    setDomain('')
    setNameError('')
    setCreateError(null)
    setModalOpen(true)
  }

  function openEditModal(inst) {
    setEditTarget(inst)
    setName(inst.name)
    setDomain(inst.domain ?? '')
    setNameError('')
    setCreateError(null)
    setModalOpen(true)
  }

  async function handleCreate() {
    if (!name.trim()) {
      setNameError('El nombre es obligatorio')
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const isEdit = !!editTarget
      const payload = { name: name.trim(), domain: domain.trim() || null }
      const res = isEdit
        ? await editarInstitucion(token, editTarget.id, payload)
        : await crearInstitucion(token, payload)
      if (!res.ok) throw new Error(res.error || (isEdit ? 'Error al editar la institución' : 'Error al crear la institución'))
      setModalOpen(false)
      toast({
        type: 'success',
        title: isEdit ? 'Institución actualizada' : 'Institución creada',
        message: `"${res.data.name}" fue ${isEdit ? 'actualizada' : 'agregada'} correctamente.`,
      })
      load()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const columnas = [
    { key: 'name', label: 'Nombre' },
    { key: 'domain', label: 'Dominio de correo', render: (v) => v ?? '—' },
    {
      key: 'created_at',
      label: 'Creada',
      render: (v) => (
        <span style={{ fontSize: 'var(--font-size-caption)', color: 'var(--color-text-tertiary)' }}>
          {new Date(v).toLocaleDateString(APP_LOCALE)}
        </span>
      ),
    },
    {
      key: 'id',
      label: '',
      render: (_, row) => (
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => openEditModal(row)}>
          Editar
        </Button>
      ),
    },
  ]

  return (
    <main className="page-container">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography as="h1">Instituciones</Typography>
        <Typography as="small" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Las instituciones agrupan perfiles y permiten detectar la institución del usuario por dominio de correo.
        </Typography>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <Button icon={Plus} onClick={openModal}>
          Nueva institución
        </Button>
      </div>

      {loading ? (
        <DataTable columns={columnas} data={[]} loading={true} />
      ) : institutions.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Sin instituciones registradas"
          message="Agrega la primera institución para habilitar la detección automática por dominio de correo."
          action={
            <Button size="sm" icon={Plus} onClick={openModal}>
              Nueva institución
            </Button>
          }
        />
      ) : (
        <DataTable columns={columnas} data={institutions} loading={false} />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Editar institución' : 'Nueva institución'}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={creating}>
              {editTarget ? 'Guardar cambios' : 'Crear institución'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {createError && <Alert variant="error">{createError}</Alert>}
          <FormField
            id="inst-name"
            label="Nombre"
            placeholder="Universidad Nacional"
            required
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError('') }}
            error={nameError}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <FormField
              id="inst-domain"
              label="Dominio de correo (opcional)"
              placeholder="unam.mx"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <Typography as="small" style={{ color: 'var(--color-text-secondary)' }}>
              Si se especifica, los usuarios con este dominio verán la institución pre-asignada al activar su cuenta.
            </Typography>
          </div>
        </div>
      </Modal>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  )
}
