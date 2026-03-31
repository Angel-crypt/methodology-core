from __future__ import annotations

# keycloak.py
# Módulo: core
# Responsabilidad: cliente de integración con Keycloak
# Criterios de aceptación relacionados: CA-SYNC-01, CA-SYNC-02
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 5


class KeycloakClient:
    async def link_user(self) -> None:
        raise NotImplementedError

    async def disable_user(self) -> None:
        raise NotImplementedError
