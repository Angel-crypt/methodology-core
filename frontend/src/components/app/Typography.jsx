/**
 * Typography — renders semantic HTML with DS token styles
 * Props: as ('display'|'h1'|'h2'|'h3'|'body'|'small'|'caption'|'label'|'code'),
 *        children, className
 */

const variantMap = {
  display: {
    tag: 'p',
    style: {
      fontSize: 'var(--font-size-display)',
      fontWeight: 'var(--font-weight-medium)',
      lineHeight: 'var(--line-height-tight)',
      color: 'var(--color-text-primary)',
    },
  },
  h1: {
    tag: 'h1',
    style: {
      fontSize: 'var(--font-size-h1)',
      fontWeight: 'var(--font-weight-medium)',
      lineHeight: 'var(--line-height-tight)',
      color: 'var(--color-text-primary)',
    },
  },
  h2: {
    tag: 'h2',
    style: {
      fontSize: 'var(--font-size-h2)',
      fontWeight: 'var(--font-weight-medium)',
      lineHeight: 'var(--line-height-tight)',
      color: 'var(--color-text-primary)',
    },
  },
  h3: {
    tag: 'h3',
    style: {
      fontSize: 'var(--font-size-h3)',
      fontWeight: 'var(--font-weight-medium)',
      lineHeight: 'var(--line-height-tight)',
      color: 'var(--color-text-primary)',
    },
  },
  body: {
    tag: 'p',
    style: {
      fontSize: 'var(--font-size-body)',
      fontWeight: 'var(--font-weight-regular)',
      lineHeight: 'var(--line-height-normal)',
      color: 'var(--color-text-primary)',
    },
  },
  small: {
    tag: 'p',
    style: {
      fontSize: 'var(--font-size-small)',
      fontWeight: 'var(--font-weight-regular)',
      lineHeight: 'var(--line-height-normal)',
      color: 'var(--color-text-primary)',
    },
  },
  caption: {
    tag: 'span',
    style: {
      fontSize: 'var(--font-size-caption)',
      fontWeight: 'var(--font-weight-regular)',
      lineHeight: 'var(--line-height-normal)',
      color: 'var(--color-text-secondary)',
    },
  },
  label: {
    tag: 'span',
    style: {
      fontSize: 'var(--font-size-label)',
      fontWeight: 'var(--font-weight-medium)',
      lineHeight: 'var(--line-height-normal)',
      color: 'var(--color-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--letter-spacing-label)',
    },
  },
  code: {
    tag: 'code',
    style: {
      fontSize: 'var(--font-size-code)',
      fontFamily: 'var(--font-mono)',
      color: 'var(--color-text-primary)',
      backgroundColor: 'var(--color-bg-subtle)',
      padding: '2px 6px',
      borderRadius: 'var(--radius-sm)',
    },
  },
}

function Typography({ as = 'body', children, className = '', style: styleProp }) {
  const variant = variantMap[as] || variantMap.body
  const Tag = variant.tag

  return (
    <Tag
      className={className}
      style={{ ...variant.style, ...styleProp }}
    >
      {children}
    </Tag>
  )
}

export default Typography
