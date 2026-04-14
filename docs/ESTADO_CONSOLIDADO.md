# Estado consolidado — methodology-core

Fuente de verdad: estado actual del codigo + `docs/INVENTARIO.md` actualizado + auditorias recientes. Sin historico ni bitacora.

## Resumen ejecutivo
- M1–M4 operativos con OIDC + magic link para researcher/applicator y login de sistema para SUPERADMIN.
- M5/M6 incompletos: solo existe `/applications/my` (applicator). No existe `/applications`, `/applications/stats` ni `/export/*`.
- Pendientes criticos: sesion expirada -> redirect, password fuerte SUPERADMIN, M5/M6, enforcement min_days.

## Estado por modulo (actual)
- M1 Autenticacion y acceso: OIDC + SystemLoginPage, magic link activo, AuthContext/UserContext activos.
- M2 Instrumentos: CRUD completo con tags y `min_days_between_applications`.
- M3 Metricas: CRUD completo por instrumento.
- M4 Registro operativo: wizard con proyecto, sujetos, contexto, aplicaciones y metricas.
- M5 Consulta: pendiente para researcher (detalle) y SUPERADMIN (solo estadisticas). Existe solo historial applicator via `/applications/my`.
- M6 Exportacion: no implementado.

## Pendientes auditados (IDs)

### P0/P1 (seguridad y bloqueos)
- [C-05] Sesion expirada no redirige a login.
- [C-03] No hay validacion de password fuerte para SUPERADMIN.
- [H-01] Falta M5: UI `/registros` + GET `/applications` con filtros.
- [H-02] Falta M6: UI `/exportar` + `/export/csv|json` con audit log.
- [G-05] Enforce `min_days_between_applications` en backend (solo bloqueo parcial en UI).

### P2 (UX e inconsistencias)
- [C-02] Falta bloquear correos demo/prueba.
- [C-04] Reset password solo SUPERADMIN: falta enforcement backend/guardas en detalle.
- [C-06] Resolucion de institucion por subdominio.
- [F-06] Mostrar estado desactivado en miembros de proyecto.
- [E-05] Click en fila tabla instrumentos -> detalle.
- [E-02] Texto dinamico “Agregar metrica”.
- [E-01] Placeholder para `min_days_between_applications` (no valor 0 visible).
- [G-01] Guide tour por rol + boton “Guia de uso”.
- [G-02] FAQ.
- [G-03] LADA separado del telefono y validacion por LADA.

### P3 (legal y deuda tecnica)
- [B-03] Falta `LICENSE`.
- [B-04] Falta licencia de datos.
- [B-05] Falta flujo ARCO/eliminacion.
- [A-03] Falta analisis de brechas de seguridad documentado.
- [A-04] Verificar duplicados/consistencia en `components/app/`.

### No verificable desde repo
- [A-01] / [A-02] TDD (orden temporal) no es verificable solo con el repo.

## Estado legal y privacidad
- T&C y Aviso de Privacidad existen y se registran por usuario.
- ARCO: solo desactivar cuentas; falta eliminacion formal.
- Licencia de codigo y datos: no documentadas.

## Instituciones
- Placeholder aun usa “unam.mx”. Falta “Global University” + `globaluniversity.edu.mx`.
- Resolucion de institucion solo por dominio exacto; falta subdominios.

## Contratos y decisiones vigentes (SRS resueltas)
- Auth: OIDC con magic link para researcher/applicator; password solo SUPERADMIN.
- Instrumentos globales, asignables a proyectos. Datos operativos siempre por proyecto.
- M5 detalle solo para Investigador; SUPERADMIN solo estadisticas agregadas.
- M6 exportacion solo para Investigador.

## Hallazgos no documentados (vigentes)
- `GlobalSearch` usa `instr.status` en lugar de `is_active`.
- `DataTable` usa `row.active` en estilos; el modelo expone `is_active`.
- Creacion de proyecto: contrato `age_cohort_ranges/mode` en frontend vs `age_cohort_map/cohort_mode` en mock.
- `/mis-registros` sin paginacion server-side y muestra `subject_id` en lugar de `anonymous_code`.

## Plan de accion condensado (orden sugerido)
1. C-05, C-03
2. H-01 -> H-02
3. G-05
4. C-04, C-02, C-06
5. F-06, E-05, E-02, E-01, D-02, D-01
6. G-01, G-03, G-02
7. B-05, B-04, B-03
8. A-03, A-04
