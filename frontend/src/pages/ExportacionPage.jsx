import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button, DatePicker, Spinner, Typography, ToastContainer, useToast } from '@/components/app'
import { exportarCSV, exportarJSON } from '@/services/exportacion'
import { listarInstrumentos } from '@/services/instruments'

export default function ExportacionPage() {
  const { token } = useAuth()
  const { toasts, addToast, removeToast } = useToast()

  const [instruments, setInstruments] = useState([])
  const [filters, setFilters] = useState({ instrument_id: '', start_date: '', end_date: '' })
  const [loadingCSV,  setLoadingCSV]  = useState(false)
  const [loadingJSON, setLoadingJSON] = useState(false)

  useEffect(() => {
    listarInstrumentos(token).then((r) => {
      if (r.ok) setInstruments(r.data || [])
    })
  }, [token])

  function handleFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({ instrument_id: '', start_date: '', end_date: '' })
  }

  function activeParams() {
    const p = {}
    if (filters.instrument_id) p.instrument_id = filters.instrument_id
    if (filters.start_date)    p.start_date    = filters.start_date
    if (filters.end_date)      p.end_date      = filters.end_date
    return p
  }

  async function handleCSV() {
    setLoadingCSV(true)
    const result = await exportarCSV(token, activeParams())
    if (!result.ok) addToast({ type: 'error', message: result.error || 'Error al exportar CSV' })
    else addToast({ type: 'success', message: 'Descarga CSV iniciada' })
    setLoadingCSV(false)
  }

  async function handleJSON() {
    setLoadingJSON(true)
    const result = await exportarJSON(token, activeParams())
    if (!result.ok) addToast({ type: 'error', message: result.error || 'Error al exportar JSON' })
    else addToast({ type: 'success', message: 'Descarga JSON iniciada' })
    setLoadingJSON(false)
  }

  const hasFilters = filters.instrument_id || filters.start_date || filters.end_date

  return (
    <main style={{ padding: 'var(--space-6)', maxWidth: '800px' }}>
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <Typography variant="h1">Exportación del Dataset</Typography>
        <Typography variant="body" style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          Descarga el dataset de aplicaciones en formato CSV o JSON. Aplicá filtros opcionales antes de exportar.
        </Typography>
      </div>

      {/* Filtros */}
      <section style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
        <Typography variant="h3" style={{ marginBottom: 'var(--space-4)' }}>Filtros (opcionales)</Typography>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Instrumento
            </label>
            <select
              value={filters.instrument_id}
              onChange={(e) => handleFilter('instrument_id', e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-small)',
              }}
            >
              <option value="">Todos los instrumentos</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Desde
            </label>
            <DatePicker
              value={filters.start_date}
              onChange={(iso) => handleFilter('start_date', iso || '')}
              placeholder="Fecha inicio"
              max={filters.end_date || undefined}
            />
          </div>

          <div style={{ flex: '1 1 150px' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-1)' }}>
              Hasta
            </label>
            <DatePicker
              value={filters.end_date}
              onChange={(iso) => handleFilter('end_date', iso || '')}
              placeholder="Fecha fin"
              min={filters.start_date || undefined}
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpiar
            </Button>
          )}
        </div>
      </section>

      {/* Botones de descarga */}
      <section style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 240px', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
          <Typography variant="h3" style={{ marginBottom: 'var(--space-2)' }}>CSV</Typography>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-4)' }}>
            Tabla plana. Una fila por aplicación, una columna por métrica. Compatible con Excel y herramientas de análisis.
          </Typography>
          <Button
            variant="primary"
            onClick={handleCSV}
            disabled={loadingCSV || loadingJSON}
            style={{ width: '100%' }}
          >
            {loadingCSV ? <Spinner size="sm" /> : <Download size={16} />}
            {loadingCSV ? 'Generando…' : 'Descargar CSV'}
          </Button>
        </div>

        <div style={{ flex: '1 1 240px', padding: 'var(--space-5)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-surface)' }}>
          <Typography variant="h3" style={{ marginBottom: 'var(--space-2)' }}>JSON</Typography>
          <Typography variant="caption" style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: 'var(--space-4)' }}>
            Jerarquía metodológica completa. Agrupado por instrumento. Insumo directo para fases de IA.
          </Typography>
          <Button
            variant="primary"
            onClick={handleJSON}
            disabled={loadingCSV || loadingJSON}
            style={{ width: '100%' }}
          >
            {loadingJSON ? <Spinner size="sm" /> : <Download size={16} />}
            {loadingJSON ? 'Generando…' : 'Descargar JSON'}
          </Button>
        </div>
      </section>
    </main>
  )
}
