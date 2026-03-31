from __future__ import annotations

# permissions.py
# Módulo: cache
# Responsabilidad: lectura/escritura/invalicación de cache de permisos
# Criterios de aceptación relacionados: CA-ACCESS-02, CA-ACCESS-04
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 8


async def get_cached_permissions() -> dict[str, object] | None:
    raise NotImplementedError


async def set_cached_permissions() -> None:
    raise NotImplementedError


async def invalidate_cached_permissions() -> None:
    raise NotImplementedError
