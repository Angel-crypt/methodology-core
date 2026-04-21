import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { APP_LOCALE } from '@/constants/locale'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_CORTOS = ['L','M','X','J','V','S','D']

function parseISO(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${parseInt(d)} ${MESES_CORTOS[parseInt(m) - 1]} ${y}`
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildGrid(year, month) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ date: new Date(year, month, 1 - startOffset + i), currentMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), currentMonth: true })
  }
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: new Date(year, month + 1, i), currentMonth: false })
  }
  return cells
}

/**
 * DatePicker — selector de fecha personalizado con estilos del DS.
 *
 * Props:
 *   id          string — id del elemento trigger
 *   value       string — fecha ISO (YYYY-MM-DD) o ''
 *   onChange    (iso: string) => void
 *   min         string — fecha ISO mínima permitida (inclusive)
 *   max         string — fecha ISO máxima permitida (inclusive)
 *   placeholder string — texto cuando no hay valor
 *   disabled    boolean
 */
function DatePicker({ id, value, onChange, min, max, placeholder, disabled }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedDate = parseISO(value)
  const minDate = parseISO(min)
  const maxDate = parseISO(max)

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(
    () => selectedDate?.getFullYear() ?? today.getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(
    () => selectedDate?.getMonth() ?? today.getMonth()
  )

  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function selectDay(date) {
    onChange(toISO(date))
    setOpen(false)
  }

  function isDisabled(date) {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const cells = buildGrid(viewYear, viewMonth)

  return (
    <div className="datepicker" ref={containerRef}>
      <button
        id={id}
        type="button"
        className={`datepicker__trigger input-base${open ? ' datepicker__trigger--open' : ''}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={value ? '' : 'datepicker__placeholder'}>
          {value ? formatDisplay(value) : (placeholder || 'Selecciona una fecha')}
        </span>
        <Calendar size={14} className="datepicker__icon" aria-hidden="true" />
      </button>

      {open && (
        <div className="datepicker__panel" role="dialog" aria-label="Selector de fecha">
          <div className="datepicker__header">
            <button type="button" className="datepicker__nav" onClick={prevMonth} aria-label="Mes anterior">
              <ChevronLeft size={14} />
            </button>
            <span className="datepicker__title">{MESES[viewMonth]} {viewYear}</span>
            <button type="button" className="datepicker__nav" onClick={nextMonth} aria-label="Mes siguiente">
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="datepicker__days-header">
            {DIAS_CORTOS.map((d) => (
              <span key={d} className="datepicker__day-name">{d}</span>
            ))}
          </div>

          <div className="datepicker__grid">
            {cells.map(({ date, currentMonth }, idx) => {
              const isToday    = isSameDay(date, today)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isDis      = isDisabled(date)

              return (
                <button
                  key={idx}
                  type="button"
                  className={[
                    'datepicker__day',
                    !currentMonth && 'datepicker__day--other-month',
                    isToday      && 'datepicker__day--today',
                    isSelected   && 'datepicker__day--selected',
                    isDis        && 'datepicker__day--disabled',
                  ].filter(Boolean).join(' ')}
                  onClick={() => !isDis && selectDay(date)}
                  disabled={isDis}
                  aria-label={date.toLocaleDateString(APP_LOCALE)}
                  aria-pressed={isSelected || false}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

DatePicker.propTypes = {
  id:          PropTypes.string,
  value:       PropTypes.string,
  onChange:    PropTypes.func.isRequired,
  min:         PropTypes.string,
  max:         PropTypes.string,
  placeholder: PropTypes.string,
  disabled:    PropTypes.bool,
}

DatePicker.defaultProps = {
  value:    '',
  disabled: false,
}

export default DatePicker
