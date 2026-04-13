import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/**
 * Convierte el rol del JWT ('administrator'|'researcher'|'applicator')
 * al formato que espera RoleBadge ('admin'|'researcher'|'aplicador').
 */
export function jwtRoleToDisplay(role) {
  if (role === 'administrator') return 'admin'
  if (role === 'applicator') return 'aplicador'
  return 'researcher'
}
