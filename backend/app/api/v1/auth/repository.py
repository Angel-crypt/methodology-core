from __future__ import annotations

# repository.py
# Módulo: auth
# Responsabilidad: acceso a datos de usuarios, magic links y sesiones
# Criterios de aceptación relacionados: CA-MAGIC-04, CA-AUTH-02
# Ver: backend/docs/ACCEPTANCE_CRITERIA.md
#
# TODO: implementar según BACKEND_SPEC.md sección 4


class AuthRepository:
    async def get_user_by_email(self) -> None:
        raise NotImplementedError

    async def save_magic_link(self) -> None:
        raise NotImplementedError
