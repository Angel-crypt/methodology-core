/**
 * SkeletonRow — animated skeleton row for tables
 * Props: cols (number, default 3)
 */

// Cycle widths for visual variety
const widths = ['70%', '50%', '30%', '60%', '45%', '55%']

function SkeletonRow({ cols = 3 }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td
          key={i}
          style={{ padding: 'var(--space-3) var(--space-4)' }}
        >
          <div
            className="skeleton"
            style={{
              height: '16px',
              width: widths[i % widths.length],
              borderRadius: 'var(--radius-md)',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

export default SkeletonRow
