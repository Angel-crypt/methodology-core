from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.cache.permissions import permissions_cache
from app.core.security import decode_jwt
from app.db.models.user import Role, UserState
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer()

# Clave de proyecto reservada para el perfil base del usuario
_PROFILE_KEY = "profile"


class CurrentUser:
    def __init__(self, user_id: uuid.UUID, email: str, role: Role):
        self.user_id = user_id
        self.email = email
        self.role = role


# ---------------------------------------------------------------------------
# Matriz de permisos centralizada  (Tarea 2.1)
# ---------------------------------------------------------------------------

PERMISSIONS_MATRIX = {
    Role.SUPERADMIN: ["*"],  # Acceso total
    Role.RESEARCHER: [
        "GET /instruments",
        "GET /metrics",
        "GET /operational-registry",
        "GET /users/me",
        "GET /projects",
    ],
    Role.APPLICATOR: [
        "GET /instruments",
        "POST /operational-registry",
        "GET /users/me",
    ],
}


# ---------------------------------------------------------------------------
# Dependencia base: extrae y valida el JWT del header Authorization
# ---------------------------------------------------------------------------

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser:
    token = credentials.credentials

    payload = decode_jwt(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Verificar que el token no esté revocado
    from app.api.v1.auth.repository import RevokedTokenRepository
    jti = payload.get("jti")
    if jti:
        revoked_repo = RevokedTokenRepository(db)
        if await revoked_repo.exists(uuid.UUID(jti)):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
            )

    user_id_str = payload["sub"]

    # Tarea 2.3 — consultar cache antes de ir a la BD
    cached = await permissions_cache.get_permissions(user_id_str, _PROFILE_KEY)
    if cached:
        # Cache HIT: usar perfil cacheado (captura cambios de rol posteriores al JWT)
        return CurrentUser(
            user_id=uuid.UUID(user_id_str),
            email=cached["email"],
            role=Role(cached["role"]),
        )

    # Cache MISS: leer usuario desde la BD para tener datos actualizados
    from app.api.v1.auth.repository import UserRepository
    user_repo = UserRepository(db)
    user = await user_repo.get_by_user_id(uuid.UUID(user_id_str))

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Guardar en cache para los próximos requests
    await permissions_cache.set_permissions(
        user_id_str,
        _PROFILE_KEY,
        {"email": user.email, "role": user.role.value},
    )

    return CurrentUser(
        user_id=user.user_id,
        email=user.email,
        role=user.role,
    )


# ---------------------------------------------------------------------------
# Dependencia SUPERADMIN  (existente)
# ---------------------------------------------------------------------------

async def require_superadmin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
) -> CurrentUser:
    if current_user.role != Role.SUPERADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SUPERADMIN role required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Dependencia RBAC genérica  (Tarea 2.1)
# ---------------------------------------------------------------------------

def require_role(allowed_roles: list[Role]):
    """
    Factory que devuelve una dependencia FastAPI que verifica
    que el usuario tenga alguno de los roles indicados.

    Uso:
        @router.get("/instruments")
        async def get_instruments(
            current_user: Annotated[CurrentUser,
                          Depends(require_role([Role.SUPERADMIN, Role.RESEARCHER]))],
        ):
    """
    async def role_checker(
        current_user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' not allowed for this endpoint",
            )
        return current_user

    return role_checker


def get_auth_service(db: Annotated[AsyncSession, Depends(get_db)]):
    from app.api.v1.auth.service import AuthService
    return AuthService(db)
