from __future__ import annotations

# scheduler.py
# Módulo: shared
# Responsabilidad: orquestar tareas de sincronización con Keycloak
# Criterios de aceptación relacionados: CA-SYNC-02, CA-SYNC-03
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 5


class SyncScheduler:
    async def start(self) -> None:
        raise NotImplementedError

    async def stop(self) -> None:
        raise NotImplementedError
