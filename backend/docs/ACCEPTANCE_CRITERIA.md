# Criterios de aceptacion y pruebas minimas del Backend

## Como usar este documento

Cada criterio debe tener al menos un test asociado en `tests/`.
Formato: dado [contexto], cuando [accion], entonces [resultado esperado].

## Identidad y autenticacion

### Magic Link

CA-MAGIC-01: Dado un usuario `pending`, cuando consume un Magic Link valido dentro del TTL, entonces queda `active` y se redirige a login OIDC sin emitir JWT.
Test: `test_magic_link_activates_pending_user`

CA-MAGIC-02: Dado un Magic Link ya usado, cuando se reintenta, entonces retorna `410`.
Test: `test_magic_link_returns_410_on_second_use`

CA-MAGIC-03: Dado un Magic Link expirado, cuando se consume, entonces retorna `410`.
Test: `test_magic_link_returns_410_when_expired`

CA-MAGIC-04: Dado el almacenamiento de Magic Link, cuando se persiste, entonces se guarda solo hash y nunca el token en claro.
Test: `test_magic_link_stored_as_hash_only`

### Estado de usuario

CA-STATE-01: Dado JWT valido con usuario `disabled`, cuando accede a endpoint protegido, entonces retorna `403 USER_DISABLED`.
Test: `test_disabled_user_returns_403_on_any_request`

CA-STATE-02: Dado JWT valido con usuario `deleted`, cuando accede a endpoint protegido, entonces retorna `403 USER_DELETED`.
Test: `test_deleted_user_returns_403_on_any_request`

CA-STATE-03: Dado cambio de correo en usuario activo, cuando usa JWT previo, entonces retorna `401` (sesion invalidada).
Test: `test_email_change_invalidates_existing_sessions`

## Sincronizacion con Keycloak

CA-SYNC-01: Dado fallo de Keycloak, cuando se cambia estado de usuario en backend, entonces estado local se persiste y `sync_pending=true`.
Test: `test_user_status_persists_and_marks_sync_pending_on_keycloak_failure`

CA-SYNC-02: Dado usuarios con `sync_pending=true`, cuando corre scheduler, entonces se reintenta sincronizacion.
Test: `test_scheduler_retries_sync_pending_users`

CA-SYNC-03: Dado 3 fallos consecutivos de sync, cuando se alcanza el maximo, entonces se registra auditoria nivel error.
Test: `test_sync_failure_logged_after_max_retries`

## Acceso por contexto y cache

CA-ACCESS-01: Dado investigador con acceso a proyecto A, cuando solicita proyecto B sin permisos, entonces retorna `403 PROJECT_ACCESS_DENIED`.
Test: `test_investigador_denied_access_to_unassigned_project`

CA-ACCESS-02: Dado cache hit en Redis, cuando valida permisos, entonces no consulta DB.
Test: `test_permissions_served_from_cache_without_db_query`

CA-ACCESS-03: Dado cache miss, cuando consulta DB, entonces cachea permisos para siguiente request.
Test: `test_permissions_cached_after_db_fallback`

CA-ACCESS-04: Dado cambio de rol/permisos por SUPERADMIN, cuando se aplica, entonces invalida cache explicita.
Test: `test_permission_change_invalidates_cache`

## Cifrado y proteccion

CA-ENC-01: Dado campo sensible, cuando se persiste, entonces no queda legible en texto plano.
Test: `test_sensitive_field_encrypted_in_db`

CA-ENC-02: Dado error de clave para descifrado, cuando ocurre, entonces se maneja sin fuga y se audita.
Test: `test_encrypted_data_error_handled_gracefully`

CA-ENC-03: Dado derivacion HKDF por dataset, cuando se usa, entonces la clave derivada no se persiste en DB ni Redis.
Test: `test_derived_keys_not_persisted_anywhere`

## Auditoria

CA-AUDIT-01: Dada accion de SUPERADMIN, cuando se ejecuta, entonces genera log JSON con `user_id`, `project_id` (si aplica), accion y timestamp.
Test: `test_superadmin_action_produces_structured_log`

CA-AUDIT-02: Dado login fallido, cuando ocurre, entonces se registra sin token completo ni secretos.
Test: `test_failed_login_logged_without_sensitive_data`

CA-AUDIT-03: Dado acceso a dataset, cuando ocurre, entonces log incluye `project_id` y `dataset_id`.
Test: `test_dataset_access_logged_with_context`

## Performance

CA-PERF-01: Bajo carga normal, p95 lectura < 500ms.
Test: `locust_load_test_read_endpoints`

CA-PERF-02: Bajo estres 2x, el sistema degrada con 429 antes de 500.
Test: `locust_stress_test_degradation`

CA-PERF-03: Bajo soak 30 min, p95 no degrada mas de 20% minuto 1 vs 30.
Test: `locust_soak_test_stability`

CA-PERF-04: Bajo carga normal sostenida, cache hit Redis > 80%.
Test: `locust_measure_cache_hit_rate`

## Contratos

CA-CONTRACT-01: Para cada endpoint M1-M4, response del backend coincide con contrato XML vigente.
Test: `tests/contract/test_contracts.py`

CA-CONTRACT-02: Si cambia un XML sin actualizar implementacion, contract tests fallan en CI.
Test: `ci_contract_tests_on_pr`

## Alcance pendiente

CA-SCOPE-01: M5 y M6 no se implementan en esta fase; cualquier endpoint de esos modulos debe estar ausente o marcado pendiente explicitamente.
Test: `test_m5_m6_out_of_scope_in_current_release`
