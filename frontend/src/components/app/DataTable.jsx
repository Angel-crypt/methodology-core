import PropTypes from 'prop-types'
import SkeletonRow from './SkeletonRow'
import EmptyState from './EmptyState'

/**
 * DataTable — data table with loading skeleton and empty state
 * Props: columns ([{key, label, render?}]), data ([]), loading, emptyMessage, onRowClick
 */
function DataTable({ columns = [], data = [], loading = false, emptyMessage = 'No hay datos disponibles', onRowClick }) {
  const colCount = columns.length

  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={colCount} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colCount} style={{ padding: 0 }}>
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row.id ?? rowIndex}
                className={[
                  (row.is_active === false || row.active === false) ? 'row-inactive' : '',
                  onRowClick ? 'row-clickable' : '',
                ].filter(Boolean).join(' ')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

DataTable.propTypes = {
  columns: PropTypes.array,
  data: PropTypes.array,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
  onRowClick: PropTypes.func,
}

export default DataTable
