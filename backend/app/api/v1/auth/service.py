from __future__ import annotations

# service.py
# Módulo: auth
# Responsabilidad: orquestar reglas de identidad y autenticación
# Criterios de aceptación relacionados: CA-MAGIC-01, CA-STATE-01
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 4


class AuthService:
    async def create_user(self) -> None:
        raise NotImplementedError

    async def consume_magic_link(self) -> None:
        raise NotImplementedError

    async def login(self) -> None:
        raise NotImplementedError
