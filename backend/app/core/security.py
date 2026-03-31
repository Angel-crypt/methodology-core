from __future__ import annotations

# security.py
# Módulo: core
# Responsabilidad: utilidades de seguridad JWT y validación de estado
# Criterios de aceptación relacionados: CA-STATE-01, CA-MAGIC-01
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 4


def create_access_token() -> str:
    raise NotImplementedError


def decode_access_token() -> dict[str, object]:
    raise NotImplementedError
