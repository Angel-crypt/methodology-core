/**
 * M4 – Registro Operativo Anonimizado
 * Rutas: POST /projects/:projectId/subjects,
 *        POST /subjects/:id/context, GET /subjects/:id,
 *        POST /projects/:projectId/applications,
 *        POST /projects/:projectId/applications/:applicationId/metric-values,
 *        GET /applications/my
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');
const { validateStrictInput } = require('../middleware/validateStrictInput');

const router = express.Router();

const APPLICATOR_ROLES = ['applicator', 'superadmin'];

// Enums definidos en los contratos XML (M4 contextAttributes)
const VALID_SCHOOL_TYPES = ['public', 'private', 'unknown'];
const VALID_EDUCATION_LEVELS = ['preschool', 'primary_lower', 'primary_upper', 'secondary', 'unknown'];
const VALID_GENDERS = ['male', 'female', 'non_binary', 'prefer_not_to_say'];
const VALID_SOCIO_LEVELS = ['low', 'medium', 'high', 'unknown'];

// Validación age_cohort: patrón "N-N" (ej: "6-8"), máximo 20 caracteres
const AGE_COHORT_REGEX = /^\d+-\d+$/;

// Restricciones additional_attributes (Privacy by Design: evitar PII en campos libres)
const ADDITIONAL_ATTR_MAX_KEYS = 5;
const ADDITIONAL_ATTR_KEY_MAX_LEN = 50;
const ADDITIONAL_ATTR_VALUE_MAX_LEN = 200;
// Nombres de campo que sugieren datos directamente identificables
const ADDITIONAL_ATTR_PII_BLACKLIST = [
  'nombre', 'apellido', 'name', 'surname', 'lastname',
  'dni', 'rut', 'cedula', 'pasaporte', 'passport', 'curp', 'ssn',
  'direccion', 'address', 'domicilio',
  'telefono', 'phone', 'celular', 'movil',
  'email', 'correo', 'mail',
  'nacimiento', 'birthdate', 'fecha_nacimiento', 'birthday',
  'foto', 'photo', 'imagen', 'image',
];

// Campos permitidos en POST /subjects/:id/context
const CONTEXT_ALLOWED_KEYS = [
  'school_type', 'education_level', 'age_cohort',
  'gender', 'socioeconomic_level', 'additional_attributes',
];

/**
 * Valida las restricciones de additional_attributes.
 * @returns {string|null} Mensaje de error o null si válido.
 */
function validateAdditionalAttributes(additional_attributes) {
  if (additional_attributes === null || additional_attributes === undefined) return null;

  if (typeof additional_attributes !== 'object' || Array.isArray(additional_attributes)) {
    return 'additional_attributes debe ser un objeto (clave-valor)';
  }
  const keys = Object.keys(additional_attributes);
  if (keys.length > ADDITIONAL_ATTR_MAX_KEYS) {
    return `additional_attributes no puede tener más de ${ADDITIONAL_ATTR_MAX_KEYS} campos`;
  }
  for (const key of keys) {
    if (key.length > ADDITIONAL_ATTR_KEY_MAX_LEN) {
      return `El nombre de campo "${key}" en additional_attributes excede ${ADDITIONAL_ATTR_KEY_MAX_LEN} caracteres`;
    }
    if (ADDITIONAL_ATTR_PII_BLACKLIST.includes(key.toLowerCase())) {
      return `El campo "${key}" no está permitido en additional_attributes (datos directamente identificables)`;
    }
    const val = additional_attributes[key];
    if (typeof val === 'string' && val.length > ADDITIONAL_ATTR_VALUE_MAX_LEN) {
      return `El valor del campo "${key}" excede ${ADDITIONAL_ATTR_VALUE_MAX_LEN} caracteres`;
    }
  }
  return null;
}

// POST /projects/:projectId/subjects (ruta canónica)
function createSubjectHandler(projectId) {
  return (req, res) => {
    // Privacy by Design (AD-09): el body debe estar vacío
    if (req.body !== undefined && Object.keys(req.body || {}).length > 0) {
      return res.status(400).json({ status: 'error', message: 'El cuerpo de la solicitud debe estar vacío', data: null });
    }

    // Verificar subject_limit del aplicador (SRS General 3.4)
    const perms = store.userPermissions.get(req.user.id);
    if (perms?.subject_limit != null) {
      const count = store.subjects.filter((s) => s.created_by === req.user.id).length;
      if (count >= perms.subject_limit) {
        return res.status(422).json({ status: 'error', message: 'Límite de sujetos registrables alcanzado.', data: null });
      }
    }

    const id = uuidv4();
    const anonymous_code = id.replace(/-/g, '').slice(0, 8).toUpperCase();
    const subject = {
      id,
      anonymous_code,
      project_id: projectId,
      created_by: req.user.id,
      created_at: new Date(),
      context: null,
    };
    store.subjects.push(subject);

    return res.status(201).json({
      status: 'success',
      message: 'Sujeto registrado correctamente',
      data: { id: subject.id, anonymous_code, project_id: subject.project_id, created_at: subject.created_at },
    });
  };
}

router.post('/projects/:projectId/subjects', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  return createSubjectHandler(req.params.projectId)(req, res);
});

// POST /subjects (legacy deshabilitada)
router.post('/subjects', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  return res.status(410).json({
    status: 'error',
    message: 'Ruta deprecada. Usa POST /projects/:projectId/subjects.',
    data: { code: 'DEPRECATED_ROUTE' },
  });
});

// POST /subjects/:id/context
router.post(
  '/subjects/:id/context',
  authMiddleware(APPLICATOR_ROLES),
  validateStrictInput(CONTEXT_ALLOWED_KEYS),
  (req, res) => {
    const subject = store.subjects.find((s) => s.id === req.params.id);
    if (!subject) {
      return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
    }

    // El contexto es inmutable una vez registrado (operación de un solo uso por sujeto)
    if (subject.context !== null) {
      return res.status(409).json({
        status: 'error',
        message: 'El sujeto ya tiene un contexto registrado',
        data: null,
      });
    }

    const { school_type, education_level, age_cohort, gender, socioeconomic_level, additional_attributes } = req.body || {};

    // Validaciones de enum (mensajes en español)
    if (school_type && !VALID_SCHOOL_TYPES.includes(school_type)) {
      return res.status(400).json({ status: 'error', message: `school_type inválido. Valores aceptados: ${VALID_SCHOOL_TYPES.join(' | ')}`, data: null });
    }
    if (education_level && !VALID_EDUCATION_LEVELS.includes(education_level)) {
      return res.status(400).json({ status: 'error', message: `education_level inválido. Valores aceptados: ${VALID_EDUCATION_LEVELS.join(' | ')}`, data: null });
    }
    if (gender && !VALID_GENDERS.includes(gender)) {
      return res.status(400).json({ status: 'error', message: `gender inválido. Valores aceptados: ${VALID_GENDERS.join(' | ')}`, data: null });
    }
    if (socioeconomic_level && !VALID_SOCIO_LEVELS.includes(socioeconomic_level)) {
      return res.status(400).json({ status: 'error', message: `socioeconomic_level inválido. Valores aceptados: ${VALID_SOCIO_LEVELS.join(' | ')}`, data: null });
    }

    // age_cohort debe tener el formato "N-N" (ej: "6-8") y máximo 20 caracteres
    if (age_cohort !== undefined && age_cohort !== null) {
      if (typeof age_cohort !== 'string' || age_cohort.length > 20 || !AGE_COHORT_REGEX.test(age_cohort)) {
        return res.status(400).json({
          status: 'error',
          message: 'age_cohort debe tener formato "N-N" (ej: "6-8") y un máximo de 20 caracteres',
          data: null,
        });
      }
    }

    // Validar restricciones de additional_attributes (evitar PII en campos libres)
    const attrError = validateAdditionalAttributes(additional_attributes);
    if (attrError) {
      return res.status(400).json({ status: 'error', message: attrError, data: null });
    }

    const context = {
      id: uuidv4(),
      subject_id: subject.id,
      school_type: school_type || null,
      education_level: education_level || null,
      age_cohort: age_cohort || null,
      gender: gender || null,
      socioeconomic_level: socioeconomic_level || null,
      additional_attributes: additional_attributes || null,
      created_at: new Date(),
    };
    subject.context = context;

    // Respuesta filtrada: solo los 6 campos de contexto (sin id, subject_id ni created_at internos)
    return res.status(201).json({
      status: 'success',
      message: 'Contexto registrado correctamente',
      data: {
        school_type: context.school_type,
        education_level: context.education_level,
        age_cohort: context.age_cohort,
        gender: context.gender,
        socioeconomic_level: context.socioeconomic_level,
        additional_attributes: context.additional_attributes,
      },
    });
  }
);

// GET /subjects/mine — sujetos creados por el aplicador autenticado
// MUST be registered before /subjects/:id to avoid Express matching "mine" as :id
router.get('/subjects/mine', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const mySubjects = store.subjects.filter((s) => s.created_by === req.user.id);

  return res.status(200).json({
    status: 'success',
    message: 'Sujetos recuperados',
    data: mySubjects.map((s) => {
      const project = store.projects.find((p) => p.id === s.project_id);
      return { ...s, project_name: project?.name ?? null };
    }),
  });
});

// GET /subjects/:id
router.get('/subjects/:id', authMiddleware(), (req, res) => {
  const subject = store.subjects.find((s) => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
  }

  const contextData = subject.context
    ? {
        school_type: subject.context.school_type,
        education_level: subject.context.education_level,
        age_cohort: subject.context.age_cohort,
        gender: subject.context.gender,
        socioeconomic_level: subject.context.socioeconomic_level,
        additional_attributes: subject.context.additional_attributes,
      }
    : null;

  return res.status(200).json({
    status: 'success',
    message: 'Sujeto recuperado',
    data: {
      id: subject.id,
      context: contextData,
    },
  });
});

// GET /subjects/:id/applications — aplicaciones de un sujeto específico
router.get('/subjects/:id/applications', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const subject = store.subjects.find((s) => s.id === req.params.id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
  }

  if (subject.created_by !== req.user.id) {
    return res.status(403).json({ status: 'error', message: 'No tienes acceso a este sujeto', data: null });
  }

  const apps = store.applications
    .filter((a) => a.subject_id === subject.id)
    .map((app) => {
      const instrument = store.instruments.find((i) => i.id === app.instrument_id);
      const values = store.metricValues.filter((v) => v.application_id === app.id);
      return {
        application_id: app.id,
        application_date: app.application_date,
        instrument_name: instrument ? instrument.name : '—',
        values_count: values.length,
      };
    });

  return res.status(200).json({
    status: 'success',
    message: 'Aplicaciones recuperadas',
    data: apps,
  });
});

function createApplicationInProject(req, res, projectId) {
  const { subject_id, instrument_id, application_date, notes } = req.body || {};

  if (!subject_id || !instrument_id) {
    return res.status(400).json({ status: 'error', message: 'Campos obligatorios: subject_id, instrument_id', data: null });
  }

  const subject = store.subjects.find((s) => s.id === subject_id);
  if (!subject) {
    return res.status(404).json({ status: 'error', message: 'Sujeto no encontrado', data: null });
  }
  if (subject.project_id !== projectId) {
    return res.status(422).json({ status: 'error', message: 'El sujeto no pertenece al proyecto indicado', data: null });
  }

  const assigned = store.projectInstruments.some(
    (pi) => pi.project_id === projectId && pi.instrument_id === instrument_id
  );
  if (!assigned) {
    return res.status(422).json({ status: 'error', message: 'El instrumento no está asignado a este proyecto', data: null });
  }

  const instrument = store.instruments.find((i) => i.id === instrument_id);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  if (!instrument.is_active) {
    return res.status(422).json({
      status: 'error',
      message: 'El instrumento está inactivo y no puede recibir nuevas aplicaciones',
      data: null,
    });
  }

  // Normalizar fecha a YYYY-MM-DD para comparaciones timezone-safe
  let appDateStr;
  if (application_date) {
    // Validar que sea una fecha ISO 8601 válida
    const parsed = new Date(application_date);
    if (isNaN(parsed.getTime())) {
      return res.status(400).json({ status: 'error', message: 'Formato de application_date inválido. Use ISO 8601: YYYY-MM-DD', data: null });
    }
    // Extraer solo la parte de fecha (evita problemas de zona horaria)
    appDateStr = application_date.split('T')[0];
  } else {
    // Fecha actual en UTC (timezone-safe)
    appDateStr = new Date().toISOString().split('T')[0];
  }

  // Validar periodo de vigencia usando comparación de strings YYYY-MM-DD (timezone-safe)
  if (instrument.start_date && appDateStr < instrument.start_date) {
    return res.status(400).json({ status: 'error', message: 'La fecha de aplicación está fuera del periodo de vigencia del instrumento', data: null });
  }
  if (instrument.end_date && appDateStr > instrument.end_date) {
    return res.status(400).json({ status: 'error', message: 'La fecha de aplicación está fuera del periodo de vigencia del instrumento', data: null });
  }

  const application = {
    id: uuidv4(),
    subject_id,
    instrument_id,
    application_date: appDateStr,
    notes: notes || null,
    created_at: new Date(),
  };
  store.applications.push(application);

  return res.status(201).json({
    status: 'success',
    message: 'Aplicación registrada correctamente',
    data: application,
  });
}

router.post('/projects/:projectId/applications', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  return createApplicationInProject(req, res, req.params.projectId);
});

// POST /applications (legacy deshabilitada)
router.post('/applications', authMiddleware(APPLICATOR_ROLES), (_req, res) => {
  return res.status(410).json({
    status: 'error',
    message: 'Ruta deprecada. Usa POST /projects/:projectId/applications.',
    data: { code: 'DEPRECATED_ROUTE' },
  });
});

// ─── GET /applications/my ─────────────────────────────────────────────────────
// Devuelve todas las aplicaciones del aplicador autenticado, enriquecidas con
// nombre del instrumento y valores de métrica capturados.
router.get('/applications/my', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.page_size, 10) || 20, 1), 100);
  const from = req.query.from;
  const to = req.query.to;
  const instrumentFilter = (req.query.instrument || '').toString().trim().toLowerCase();
  const projectFilter = (req.query.project_id || '').toString().trim();

  const mySubjects = store.subjects.filter((s) => s.created_by === req.user.id);
  const mySubjectIds = new Set(mySubjects.map((s) => s.id));

  let myApplications = store.applications.filter((a) => mySubjectIds.has(a.subject_id));

  if (from) myApplications = myApplications.filter((a) => a.application_date >= from);
  if (to) myApplications = myApplications.filter((a) => a.application_date <= to);
  if (projectFilter) {
    const subjectsInProject = new Set(mySubjects.filter((s) => s.project_id === projectFilter).map((s) => s.id));
    myApplications = myApplications.filter((a) => subjectsInProject.has(a.subject_id));
  }

  const result = myApplications.map((app) => {
    const instrument = store.instruments.find((i) => i.id === app.instrument_id);
    const values = store.metricValues.filter((v) => v.application_id === app.id);
    const subject = store.subjects.find((s) => s.id === app.subject_id);
    const project = store.projects.find((p) => p.id === subject?.project_id);
    return {
      application_id: app.id,
      anonymous_code: subject?.anonymous_code || app.subject_id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      instrument_id:  app.instrument_id,
      instrument_name: instrument ? instrument.name : '—',
      application_date: app.application_date,
      notes:          app.notes,
      created_at:     app.created_at,
      project_id:     subject?.project_id ?? null,
      project_name:   project?.name ?? null,
      values_count:   values.length,
      metric_values:  values.map((v) => {
        const metric = store.metrics.find((m) => m.id === v.metric_id);
        return {
          metric_id:   v.metric_id,
          metric_name: metric ? metric.name : '—',
          metric_type: metric ? metric.metric_type : '—',
          value:       v.value,
        };
      }),
    };
  });

  const filtered = instrumentFilter
    ? result.filter((r) => (r.instrument_name || '').toLowerCase().includes(instrumentFilter))
    : result;

  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  return res.status(200).json({
    status:  'success',
    message: 'Registros recuperados',
    data:    paged,
    meta: {
      total,
      page,
      page_size: pageSize,
      pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
});

function saveMetricValues(req, res, applicationId, projectId) {
  const { values } = req.body || {};

  if (!applicationId || !values || !Array.isArray(values) || values.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Campos obligatorios: application_id, values (array no vacío)',
      data: null,
    });
  }

  const application = store.applications.find((a) => a.id === applicationId);
  if (!application) {
    return res.status(404).json({ status: 'error', message: 'Aplicación no encontrada', data: null });
  }

  const subject = store.subjects.find((s) => s.id === application.subject_id);
  if (!subject || subject.project_id !== projectId) {
    return res.status(422).json({ status: 'error', message: 'La aplicación no pertenece al proyecto indicado', data: null });
  }

  const instrumentMetrics = store.metrics.filter((m) => m.instrument_id === application.instrument_id);

  // Verificar métricas obligatorias
  const requiredMetrics = instrumentMetrics.filter((m) => m.required);
  const providedIds = values.map((v) => v.metric_id);
  const missing = requiredMetrics.filter((m) => !providedIds.includes(m.id));

  if (missing.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Faltan valores para métricas obligatorias',
      data: {
        errors: missing.map((m) => ({
          metric_id: m.id,
          metric_name: m.name,
          error: `La métrica "${m.name}" es obligatoria`,
        })),
      },
    });
  }

  // Validar tipo y rango de cada valor (operación atómica: colectar todos los errores primero)
  const errors = [];
  for (const v of values) {
    const metric = instrumentMetrics.find((m) => m.id === v.metric_id);
    if (!metric) {
      errors.push({ metric_id: v.metric_id, metric_name: null, error: 'La métrica no pertenece a este instrumento' });
      continue;
    }

    switch (metric.metric_type) {
      case 'numeric':
        if (typeof v.value !== 'number') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser un número' });
        } else {
          if (metric.min_value !== null && v.value < metric.min_value) {
            errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor ${v.value} es menor que min_value (${metric.min_value})` });
          }
          if (metric.max_value !== null && v.value > metric.max_value) {
            errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor ${v.value} supera max_value (${metric.max_value})` });
          }
        }
        break;
      case 'boolean':
        if (typeof v.value !== 'boolean') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser un booleano (true | false)' });
        }
        break;
      case 'categorical':
        if (!metric.options.includes(v.value)) {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: `El valor "${v.value}" no está entre las opciones permitidas` });
        }
        break;
      case 'short_text':
        if (typeof v.value !== 'string') {
          errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'El valor debe ser una cadena de texto' });
        }
        break;
      default:
        errors.push({ metric_id: v.metric_id, metric_name: metric.name, error: 'Tipo de métrica desconocido' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validación de valores de métrica fallida',
      data: { errors },
    });
  }

  // Persistir de forma atómica
  const recorded = values.map((v) => ({
    id: uuidv4(),
    application_id: applicationId,
    metric_id: v.metric_id,
    value: v.value,
    created_at: new Date(),
  }));
  store.metricValues.push(...recorded);

  return res.status(201).json({
    status: 'success',
    message: 'Valores de métrica registrados correctamente',
    data: {
      application_id: applicationId,
      values_count: recorded.length,
      values: recorded.map((v) => ({ id: v.id, metric_id: v.metric_id, value: v.value })),
    },
  });
}

router.post('/projects/:projectId/applications/:applicationId/metric-values', authMiddleware(APPLICATOR_ROLES), (req, res) => {
  return saveMetricValues(req, res, req.params.applicationId, req.params.projectId);
});

// POST /metric-values (legacy deshabilitada)
router.post('/metric-values', authMiddleware(APPLICATOR_ROLES), (_req, res) => {
  return res.status(410).json({
    status: 'error',
    message: 'Ruta deprecada. Usa POST /projects/:projectId/applications/:applicationId/metric-values.',
    data: { code: 'DEPRECATED_ROUTE' },
  });
});

module.exports = router;
