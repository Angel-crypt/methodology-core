/**
 * M2-PROJECT — Gestión de Proyectos
 *
 * Rutas:
 *   POST   /projects
 *   GET    /projects
 *   GET    /projects/:id
 *   PATCH  /projects/:id
 *   DELETE /projects/:id
 *
 *   POST   /projects/:id/members
 *   GET    /projects/:id/members
 *   DELETE /projects/:id/members/:userId
 *
 *   POST   /projects/:id/instruments
 *   GET    /projects/:id/instruments
 *   DELETE /projects/:id/instruments/:instrumentId
 *
 *   GET    /projects/:id/config/operativo
 *   PUT    /projects/:id/config/operativo
 *
 *   GET    /config/system-defaults
 *
 *   GET    /projects/:id/subjects/mine   (CF-016)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { store } = require('../store');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const SYSTEM_DEFAULTS = store._systemDefaults;

const ADMIN_ROLES = ['superadmin'];
const ANY_AUTH   = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Devuelve true si el usuario tiene acceso al proyecto (superadmin o miembro). */
function hasProjectAccess(userId, role, projectId) {
  if (role === 'superadmin') return true;
  return store.projectMembers.some(
    (m) => m.project_id === projectId && m.user_id === userId
  );
}

/** Serializa un proyecto con member_count e instrument_count. */
function serializeProject(p) {
  return {
    id:             p.id,
    name:           p.name,
    description:    p.description,
    created_by:     p.created_by,
    created_at:     p.created_at,
    updated_at:     p.updated_at,
    member_count:   store.projectMembers.filter((m) => m.project_id === p.id).length,
    instrument_count: store.projectInstruments.filter((pi) => pi.project_id === p.id).length,
  };
}

/** Valida y normaliza la config operativa entrante. */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    return { ok: false, message: 'config debe ser un objeto' };
  }
  const { education_levels, age_cohort_map, cohort_mode, subject_limit, mode } = config;

  if (education_levels !== undefined) {
    if (!Array.isArray(education_levels) || education_levels.some((x) => typeof x !== 'string')) {
      return { ok: false, message: 'education_levels debe ser un array de strings' };
    }
  }
  if (age_cohort_map !== undefined) {
    if (typeof age_cohort_map !== 'object' || Array.isArray(age_cohort_map)) {
      return { ok: false, message: 'age_cohort_map debe ser un objeto { nivel: rango }' };
    }
  }
  if (cohort_mode !== undefined && !['libre', 'restringido'].includes(cohort_mode)) {
    return { ok: false, message: "cohort_mode debe ser 'libre' o 'restringido'" };
  }
  if (subject_limit !== undefined) {
    if (!Number.isInteger(subject_limit) || subject_limit < 0) {
      return { ok: false, message: 'subject_limit debe ser un entero mayor o igual a 0' };
    }
  }
  if (mode !== undefined && !['normal', 'restricted'].includes(mode)) {
    return { ok: false, message: "mode debe ser 'normal' o 'restricted'" };
  }
  return { ok: true };
}

// ─── GET /config/system-defaults ─────────────────────────────────────────────
router.get('/config/system-defaults', authMiddleware(ADMIN_ROLES), (_req, res) => {
  return res.json({ status: 'success', data: SYSTEM_DEFAULTS });
});

// ─── POST /projects ───────────────────────────────────────────────────────────
router.post('/projects', authMiddleware(ADMIN_ROLES), (req, res) => {
  const { name, description, use_defaults, config } = req.body || {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      status: 'error',
      message: 'El campo name es obligatorio',
      data: { code: 'VALIDATION_ERROR' },
    });
  }

  if (use_defaults === undefined && config === undefined) {
    return res.status(400).json({
      status: 'error',
      message: 'Debes elegir use_defaults: true o proveer un objeto config',
      data: { code: 'CONFIG_REQUIRED' },
    });
  }

  let resolvedConfig;
  if (use_defaults === true) {
    resolvedConfig = { ...SYSTEM_DEFAULTS };
  } else {
    const validation = validateConfig(config);
    if (!validation.ok) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
        data: { code: 'VALIDATION_ERROR' },
      });
    }
    resolvedConfig = {
      education_levels: config.education_levels ?? SYSTEM_DEFAULTS.education_levels,
      age_cohort_map:   config.age_cohort_map   ?? SYSTEM_DEFAULTS.age_cohort_map,
      cohort_mode:      config.cohort_mode      ?? SYSTEM_DEFAULTS.cohort_mode,
      subject_limit:    config.subject_limit    ?? SYSTEM_DEFAULTS.subject_limit,
      mode:             config.mode             ?? SYSTEM_DEFAULTS.mode,
    };
  }

  const project = {
    id:          uuidv4(),
    name:        name.trim(),
    description: description?.trim() || null,
    created_by:  req.user.id,
    created_at:  new Date(),
    updated_at:  null,
  };
  store.projects.push(project);
  store.projectConfigs.set(project.id, resolvedConfig);

  return res.status(201).json({
    status: 'success',
    message: 'Proyecto creado correctamente',
    data: serializeProject(project),
  });
});

// ─── GET /projects ────────────────────────────────────────────────────────────
router.get('/projects', authMiddleware(ANY_AUTH), (req, res) => {
  let projects = store.projects;
  const { member_id } = req.query;

  // Superadmin con member_id: proyectos donde ese usuario es miembro
  if (req.user.role === 'superadmin' && member_id) {
    const memberships = store.projectMembers.filter((m) => m.user_id === member_id);
    const memberProjectIds = new Set(memberships.map((m) => m.project_id));
    projects = projects.filter((p) => memberProjectIds.has(p.id));
    return res.json({
      status: 'success',
      data: projects.map((p) => {
        const membership = memberships.find((m) => m.project_id === p.id);
        return { ...serializeProject(p), user_role: membership?.role ?? null };
      }),
    });
  }

  // Researcher/applicator: solo proyectos donde son miembros
  if (req.user.role !== 'superadmin') {
    const memberProjectIds = new Set(
      store.projectMembers
        .filter((m) => m.user_id === req.user.id)
        .map((m) => m.project_id)
    );
    projects = projects.filter((p) => memberProjectIds.has(p.id));
  }

  return res.json({
    status: 'success',
    data: projects.map(serializeProject),
  });
});

// ─── GET /projects/:id ────────────────────────────────────────────────────────
router.get('/projects/:id', authMiddleware(ANY_AUTH), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  if (!hasProjectAccess(req.user.id, req.user.role, project.id)) {
    return res.status(403).json({ status: 'error', message: 'Acceso denegado', data: null });
  }

  const members = store.projectMembers
    .filter((m) => m.project_id === project.id)
    .map((m) => {
      const user = store.users.find((u) => u.id === m.user_id);
      return {
        id:         m.id,
        user_id:    m.user_id,
        email:      user?.email || null,
        full_name:  user?.full_name || null,
        role:       m.role,
        added_at:   m.added_at,
      };
    });

  const instruments = store.projectInstruments
    .filter((pi) => pi.project_id === project.id)
    .map((pi) => {
      const inst = store.instruments.find((i) => i.id === pi.instrument_id);
      return inst
        ? { id: inst.id, name: inst.name, is_active: inst.is_active, tags: inst.tags || [], min_days_between_applications: inst.min_days_between_applications ?? 0 }
        : { id: pi.instrument_id, name: null };
    });

  return res.json({
    status: 'success',
    data: {
      ...serializeProject(project),
      members,
      instruments,
    },
  });
});

// ─── PATCH /projects/:id ──────────────────────────────────────────────────────
router.patch('/projects/:id', authMiddleware(ADMIN_ROLES), (req, res) => {
  const { name, description } = req.body || {};

  if (!name && description === undefined) {
    return res.status(400).json({ status: 'error', message: 'El cuerpo no puede estar vacío', data: null });
  }

  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  if (name) project.name = name.trim();
  if (description !== undefined) project.description = description?.trim() || null;
  project.updated_at = new Date();

  return res.json({
    status: 'success',
    message: 'Proyecto actualizado',
    data: serializeProject(project),
  });
});

// ─── DELETE /projects/:id ─────────────────────────────────────────────────────
router.delete('/projects/:id', authMiddleware(ADMIN_ROLES), (req, res) => {
  const idx = store.projects.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  const [project] = store.projects.splice(idx, 1);
  // Limpiar datos asociados
  store.projectMembers     = store.projectMembers.filter((m) => m.project_id !== project.id);
  store.projectInstruments = store.projectInstruments.filter((pi) => pi.project_id !== project.id);
  store.projectConfigs.delete(project.id);

  return res.status(204).send();
});

// ─── POST /projects/:id/members ───────────────────────────────────────────────
router.post('/projects/:id/members', authMiddleware(ADMIN_ROLES), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  const { user_id, role } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ status: 'error', message: 'user_id es obligatorio', data: { code: 'VALIDATION_ERROR' } });
  }
  if (!['researcher', 'applicator'].includes(role)) {
    return res.status(400).json({ status: 'error', message: "role debe ser 'researcher' o 'applicator'", data: { code: 'VALIDATION_ERROR' } });
  }

  const user = store.users.find((u) => u.id === user_id);
  if (!user) {
    return res.status(404).json({ status: 'error', message: 'Usuario no encontrado', data: null });
  }
  if (!user.active) {
    return res.status(400).json({ status: 'error', message: 'Solo se pueden agregar usuarios con cuenta activa', data: { code: 'USER_NOT_ACTIVE' } });
  }

  const alreadyMember = store.projectMembers.some(
    (m) => m.project_id === project.id && m.user_id === user_id
  );
  if (alreadyMember) {
    return res.status(409).json({ status: 'error', message: 'El usuario ya es miembro del proyecto', data: { code: 'ALREADY_MEMBER' } });
  }

  const member = { id: uuidv4(), project_id: project.id, user_id, role, added_at: new Date() };
  store.projectMembers.push(member);

  return res.status(201).json({
    status: 'success',
    message: 'Miembro agregado',
    data: { ...member, email: user.email, full_name: user.full_name },
  });
});

// ─── GET /projects/:id/members ────────────────────────────────────────────────
router.get('/projects/:id/members', authMiddleware(ANY_AUTH), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }
  if (!hasProjectAccess(req.user.id, req.user.role, project.id)) {
    return res.status(403).json({ status: 'error', message: 'Acceso denegado', data: null });
  }

  let members = store.projectMembers.filter((m) => m.project_id === project.id);

  if (req.query.role) {
    members = members.filter((m) => m.role === req.query.role);
  }

  return res.json({
    status: 'success',
    data: members.map((m) => {
      const user = store.users.find((u) => u.id === m.user_id);
      return { id: m.id, user_id: m.user_id, email: user?.email, full_name: user?.full_name, role: m.role, added_at: m.added_at };
    }),
  });
});

// ─── DELETE /projects/:id/members/:userId ─────────────────────────────────────
router.delete('/projects/:id/members/:userId', authMiddleware(ADMIN_ROLES), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  const idx = store.projectMembers.findIndex(
    (m) => m.project_id === project.id && m.user_id === req.params.userId
  );
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Miembro no encontrado', data: null });
  }

  store.projectMembers.splice(idx, 1);
  return res.status(204).send();
});

// ─── POST /projects/:id/instruments ──────────────────────────────────────────
router.post('/projects/:id/instruments', authMiddleware(ADMIN_ROLES), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  const { instrument_id } = req.body || {};
  if (!instrument_id) {
    return res.status(400).json({ status: 'error', message: 'instrument_id es obligatorio', data: { code: 'VALIDATION_ERROR' } });
  }

  const instrument = store.instruments.find((i) => i.id === instrument_id && !i.deleted);
  if (!instrument) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no encontrado', data: null });
  }

  const alreadyAssigned = store.projectInstruments.some(
    (pi) => pi.project_id === project.id && pi.instrument_id === instrument_id
  );
  if (alreadyAssigned) {
    return res.status(409).json({ status: 'error', message: 'El instrumento ya está asignado al proyecto', data: { code: 'ALREADY_ASSIGNED' } });
  }

  const entry = { id: uuidv4(), project_id: project.id, instrument_id, added_at: new Date() };
  store.projectInstruments.push(entry);

  return res.status(201).json({
    status: 'success',
    message: 'Instrumento asignado al proyecto',
    data: entry,
  });
});

// ─── GET /projects/:id/instruments ───────────────────────────────────────────
router.get('/projects/:id/instruments', authMiddleware(ANY_AUTH), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }
  if (!hasProjectAccess(req.user.id, req.user.role, project.id)) {
    return res.status(403).json({ status: 'error', message: 'Acceso denegado', data: null });
  }

  const instruments = store.projectInstruments
    .filter((pi) => pi.project_id === project.id)
    .map((pi) => {
      const inst = store.instruments.find((i) => i.id === pi.instrument_id);
      if (!inst) return null;
      return {
        id:   inst.id,
        name: inst.name,
        methodological_description: inst.methodological_description,
        is_active: inst.is_active,
        tags: inst.tags || [],
        min_days_between_applications: inst.min_days_between_applications ?? 0,
      };
    })
    .filter(Boolean);

  return res.json({ status: 'success', data: instruments });
});

// ─── DELETE /projects/:id/instruments/:instrumentId ──────────────────────────
router.delete('/projects/:id/instruments/:instrumentId', authMiddleware(ADMIN_ROLES), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  const idx = store.projectInstruments.findIndex(
    (pi) => pi.project_id === project.id && pi.instrument_id === req.params.instrumentId
  );
  if (idx === -1) {
    return res.status(404).json({ status: 'error', message: 'Instrumento no asignado a este proyecto', data: null });
  }

  store.projectInstruments.splice(idx, 1);
  return res.status(204).send();
});

// ─── GET /projects/:id/config/operativo ──────────────────────────────────────
router.get('/projects/:id/config/operativo', authMiddleware(ANY_AUTH), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }
  if (!hasProjectAccess(req.user.id, req.user.role, project.id)) {
    return res.status(403).json({ status: 'error', message: 'Acceso denegado', data: null });
  }

  const config = store.projectConfigs.get(project.id) || { ...SYSTEM_DEFAULTS };
  return res.json({ status: 'success', data: config });
});

// ─── PUT /projects/:id/config/operativo ──────────────────────────────────────
router.put('/projects/:id/config/operativo', authMiddleware(ADMIN_ROLES), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: 'error', message: 'El cuerpo no puede estar vacío', data: null });
  }

  const validation = validateConfig(req.body);
  if (!validation.ok) {
    return res.status(400).json({ status: 'error', message: validation.message, data: { code: 'VALIDATION_ERROR' } });
  }

  const current = store.projectConfigs.get(project.id) || { ...SYSTEM_DEFAULTS };
  const updated = {
    education_levels: req.body.education_levels ?? current.education_levels,
    age_cohort_map:   req.body.age_cohort_map   ?? current.age_cohort_map,
    cohort_mode:      req.body.cohort_mode      ?? current.cohort_mode,
    subject_limit:    req.body.subject_limit    ?? current.subject_limit,
    mode:             req.body.mode             ?? current.mode,
  };
  store.projectConfigs.set(project.id, updated);

  return res.json({ status: 'success', message: 'Configuración actualizada', data: updated });
});

// ─── GET /projects/:id/subjects/mine (CF-016) ─────────────────────────────────
router.get('/projects/:id/subjects/mine', authMiddleware(), (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) {
    return res.status(404).json({ status: 'error', message: 'Proyecto no encontrado', data: null });
  }
  if (!hasProjectAccess(req.user.id, req.user.role, project.id)) {
    return res.status(403).json({ status: 'error', message: 'Acceso denegado', data: null });
  }

  const mySubjects = store.subjects.filter(
    (s) => s.project_id === req.params.id && s.created_by === req.user.id
  );

  const data = mySubjects.map((s) => {
    const myApps = store.applications.filter((a) => a.subject_id === s.id);

    const applications = myApps.map((app) => {
      const instrument = store.instruments.find((i) => i.id === app.instrument_id);
      const minDays = instrument?.min_days_between_applications ?? 0;
      let next_available_date = null;
      if (minDays > 0 && app.application_date) {
        const d = new Date(app.application_date + 'T00:00:00');
        d.setDate(d.getDate() + minDays);
        next_available_date = d.toISOString().split('T')[0];
      }
      return {
        application_id:      app.id,
        instrument_id:       app.instrument_id,
        instrument_name:     instrument?.name || '—',
        application_date:    app.application_date,
        next_available_date,
      };
    });

    return {
      id:           s.id,
      anonymous_code: s.id.split('-')[0].toUpperCase(), // simplificación mock
      created_at:   s.created_at,
      applications,
    };
  });

  return res.json({ status: 'success', data });
});

module.exports = router;
