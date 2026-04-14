from __future__ import annotations

# dependencies.py
# Módulo: shared
# Responsabilidad: dependencias transversales (auth, permisos, contexto)
# Criterios de aceptación relacionados: CA-STATE-01, CA-ACCESS-01
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 4


async def get_current_user() -> None:
    raise NotImplementedError


async def require_active_user() -> None:
    raise NotImplementedError
