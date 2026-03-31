/**
 * Configuración global del Registro Operativo
 * Controla qué opciones están disponibles en el wizard para todos los aplicadores.
 * Solo Administrador.
 */
const express = require('express');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Enums compartidos — fuente única de verdad
const {
  VALID_EDUCATION_LEVELS,
  VALID_SCHOOL_TYPES,
  VALID_GENDERS,
  VALID_SOCIOECONOMIC,
} = require('../constants/contextEnums');

// ─── GET /config/operativo ────────────────────────────────────────────────────
router.get('/config/operativo', authMiddleware(['administrator', 'applicator']), (_req, res) => {
  return res.json({ status: 'success', data: store.registroConfig });
});

// ─── PUT /config/operativo ────────────────────────────────────────────────────
router.put('/config/operativo', authMiddleware(['administrator']), (req, res) => {
  const {
    education_levels,
    cohort_mode,
    age_cohort_map,
    school_types,
    genders,
    socioeconomic_levels,
  } = req.body;

  // Validar education_levels
  if (education_levels !== undefined) {
    if (!Array.isArray(education_levels)) {
      return res.status(400).json({ status: 'error', message: 'education_levels debe ser un arreglo.', data: null });
    }
    for (const l of education_levels) {
      if (!VALID_EDUCATION_LEVELS.includes(l)) {
        return res.status(400).json({ status: 'error', message: `Nivel educativo no válido: ${l}`, data: null });
      }
    }
  }

  // Validar cohort_mode
  if (cohort_mode !== undefined && !['libre', 'restricted'].includes(cohort_mode)) {
    return res.status(400).json({ status: 'error', message: 'cohort_mode no válido.', data: null });
  }

  // Validar age_cohort_map
  if (age_cohort_map !== undefined) {
    if (typeof age_cohort_map !== 'object' || Array.isArray(age_cohort_map)) {
      return res.status(400).json({ status: 'error', message: 'age_cohort_map debe ser un objeto.', data: null });
    }
    for (const key of Object.keys(age_cohort_map)) {
      if (!VALID_EDUCATION_LEVELS.includes(key)) {
        return res.status(400).json({ status: 'error', message: `Nivel no válido en age_cohort_map: ${key}`, data: null });
      }
    }
  }

  // Validar school_types
  if (school_types !== undefined) {
    if (!Array.isArray(school_types)) {
      return res.status(400).json({ status: 'error', message: 'school_types debe ser un arreglo.', data: null });
    }
    for (const t of school_types) {
      if (!VALID_SCHOOL_TYPES.includes(t)) {
        return res.status(400).json({ status: 'error', message: `Tipo de escuela no válido: ${t}`, data: null });
      }
    }
  }

  // Validar genders
  if (genders !== undefined) {
    if (!Array.isArray(genders)) {
      return res.status(400).json({ status: 'error', message: 'genders debe ser un arreglo.', data: null });
    }
    for (const g of genders) {
      if (!VALID_GENDERS.includes(g)) {
        return res.status(400).json({ status: 'error', message: `Género no válido: ${g}`, data: null });
      }
    }
  }

  // Validar socioeconomic_levels
  if (socioeconomic_levels !== undefined) {
    if (!Array.isArray(socioeconomic_levels)) {
      return res.status(400).json({ status: 'error', message: 'socioeconomic_levels debe ser un arreglo.', data: null });
    }
    for (const s of socioeconomic_levels) {
      if (!VALID_SOCIOECONOMIC.includes(s)) {
        return res.status(400).json({ status: 'error', message: `Nivel socioeconómico no válido: ${s}`, data: null });
      }
    }
  }

  // Aplicar cambios al store (patch parcial)
  if (education_levels  !== undefined) store.registroConfig.education_levels  = education_levels;
  if (cohort_mode       !== undefined) store.registroConfig.cohort_mode        = cohort_mode;
  if (age_cohort_map    !== undefined) {
    store.registroConfig.age_cohort_map = {
      ...store.registroConfig.age_cohort_map,
      ...age_cohort_map,
    };
  }
  if (school_types         !== undefined) store.registroConfig.school_types        = school_types;
  if (genders              !== undefined) store.registroConfig.genders             = genders;
  if (socioeconomic_levels !== undefined) store.registroConfig.socioeconomic_levels = socioeconomic_levels;

  return res.json({
    status: 'success',
    message: 'Configuración actualizada.',
    data: store.registroConfig,
  });
});

module.exports = router;
