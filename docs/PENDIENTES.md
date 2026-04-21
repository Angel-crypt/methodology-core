# Pendientes — methodology-core

Lista consolidada con criterios de aceptacion minimos. Aplica Zero Trust y Privacy by Design.

- Zero Trust (transversal): todo endpoint valida JWT + rol + estado; backend enforza permisos.
- Privacy by Design (transversal): no PII en Subjects/Applications/Exports; solo `anonymous_code`.
- Auditoria (transversal): operaciones sensibles registran audit_log.

- [C-05] Redireccion por sesion expirada. Criterio: cualquier 401/SESSION_REVOKED redirige a `/login` con mensaje visible.
- [C-03] Password SUPERADMIN con reglas de fortaleza. Criterio: longitud minima y requerir mayuscula, numero y caracter especial.
- [H-01] M5 consulta paginada para investigador. Criterio: `GET /applications` paginado con filtros y metadatos completos.
- [H-01b] M5 estadisticas para SUPERADMIN. Criterio: `GET /applications/stats` retorna agregados sin datos detallados.
- [H-02] M6 exportacion. Criterio: `GET /export/csv` y `GET /export/json` con `project_id` obligatorio y audit log; SUPERADMIN -> 403.
- [G-05] Enforce `min_days_between_applications` en backend. Criterio: bloqueo y error consistente en API al violar gap.
- [C-02] Bloqueo correos demo/prueba. Criterio: validacion rechaza dominios o patrones definidos.
- [C-04] Reset password solo SUPERADMIN. Criterio: endpoints retornan 403 para otros roles y UI no muestra opcion.
- ~~[C-06] Resolucion de institucion por subdominio.~~ ✅ Resuelto 2026-04-21: stripping progresivo de subdominios en `/institutions/resolve`; `unam.edu.mx` ≠ `globaluniversity.edu.mx`.
- [F-06] Indicador de usuario desactivado en proyecto. Criterio: badge visible en lista de miembros.
- [E-05] Click en fila de instrumentos abre detalle. Criterio: click en fila navega a `/instruments/:id`.
- [E-02] Texto dinamico “Agregar metrica”. Criterio: sin metricas = “Agregar metrica”, con metricas = “Anadir otra metrica”.
- [E-01] Placeholder `min_days_between_applications`. Criterio: campo vacio con placeholder, no valor 0 visible.
- [G-01] Guide tour por rol. Criterio: boton “Guia de uso” y tour solo primera vez por rol.
- [G-02] FAQ. Criterio: seccion de preguntas frecuentes accesible en UI.
- [G-03] LADA separado. Criterio: campo LADA y telefono independientes con validacion por LADA.
- [B-03] LICENSE. Criterio: archivo `LICENSE` en el repo.
- [B-04] Licencia de datos. Criterio: documento con terminos de uso de datos.
- [B-05] ARCO/eliminacion. Criterio: flujo de eliminacion y ejercicio ARCO implementado.
- [A-03] Brechas de seguridad documentadas. Criterio: documento con listado de brechas y estado.
- [A-04] Componentes sin duplicados. Criterio: inventario y consolidacion en `components/app/`.
- [E-API-01] API exige al menos una metrica al crear instrumento. Criterio: `POST /instruments` rechaza si no hay metricas asociadas.
