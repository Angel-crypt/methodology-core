/**
 * constants/educationLevels.js
 * Metadatos de niveles educativos — fuente única de verdad para el frontend.
 * Importar desde aquí en lugar de redefinir en cada página.
 */

export const EDUCATION_LEVEL_META = {
  preschool:     { label: 'Preescolar',                desc: 'Educación inicial — 3 a 5 años'          },
  primary_lower: { label: 'Primaria inferior (1°–3°)', desc: 'Primeros grados — 6 a 9 años'            },
  primary_upper: { label: 'Primaria superior (4°–6°)', desc: 'Grados medios — 10 a 12 años'            },
  secondary:     { label: 'Secundaria',                desc: 'Educación media — 13 a 18 años'          },
  unknown:       { label: 'Desconocido',               desc: 'Nivel educativo no especificado'         },
}

export const ALL_EDUCATION_LEVELS = Object.keys(EDUCATION_LEVEL_META)
