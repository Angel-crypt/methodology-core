from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import redis.asyncio as aioredis

from app.api.v1.auth.repository import AuthRepository
from app.api.v1.auth.schemas import TokenResponse, TokenUserInfo, UserCreateRequest
from app.cache.permissions import invalidate_cached_permissions
from app.config import settings
from app.core.audit import add_audit_event
from app.core.exceptions import AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError
from app.core.keycloak import KeycloakClient
from app.core.security import create_access_token
from app.db.models.audit_log import AuditEvent
from app.db.models.user import Role, User, UserState
from app.db.models.user_permission import UserPermission


class AuthService:
    def __init__(
        self,
        repo: AuthRepository,
        keycloak: KeycloakClient,
        redis: aioredis.Redis,
    ) -> None:
        self.repo = repo
        self.keycloak = keycloak
        self.redis = redis

    # ── Helpers internos ──────────────────────────────────────────────────────

    def _generate_magic_link_token(self) -> tuple[str, str]:
        """Returns (token_raw, token_hash). token_raw uses CSPRNG (256 bits)."""
        token_raw = secrets.token_hex(32)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
        return token_raw, token_hash

    def _magic_link_expires_at(self) -> datetime:
        return datetime.now(tz=timezone.utc) + timedelta(seconds=settings.magic_link_ttl_seconds)

    async def _check_login_rate_limit(self, ip: str, email: str) -> None:
        """
        Redis-based rate limit: 5 attempts per IP+email per minute.
        Returns 401 (not 429) to preserve anti-fingerprinting (AD-08).
        """
        key = f"ratelimit:login:{ip}:{email}"
        count = await self.redis.incr(key)
        if count == 1:
            await self.redis.expire(key, 60)
        if count > 5:
            add_audit_event(self.repo.db, AuditEvent.RATE_LIMIT_TRIGGERED, ip=ip)
            await self.repo.db.commit()
            raise UnauthorizedError("Credenciales inválidas")

    # ── Usuarios ──────────────────────────────────────────────────────────────

    async def create_user(
        self,
        data: UserCreateRequest,
        actor_id: uuid.UUID,
        ip: str = "",
    ) -> tuple[User, str]:
        """
        Creates a pending user + magic link.
        Returns (user, token_raw). The raw token must be delivered to the user
        out-of-band (email). Only the SHA-256 hash is persisted (CA-MAGIC-04).
        """
        if await self.repo.get_user_by_email(data.email) is not None:
            raise ConflictError("El email ya está registrado")

        user = await self.repo.create_user(
            full_name=data.full_name,
            email=data.email,
            role=data.role,
            institution=data.institution,
            state=UserState.pending,
        )

        token_raw, token_hash = self._generate_magic_link_token()
        await self.repo.save_magic_link(user.id, token_hash, self._magic_link_expires_at())

        kc_id = await self.keycloak.create_user(email=data.email, full_name=data.full_name)
        if kc_id is None:
            await self.repo.set_sync_pending(user.id, True)

        add_audit_event(
            self.repo.db, AuditEvent.USER_CREATED, user_id=actor_id, ip=ip,
            details=f"created_user={user.id}",
        )
        add_audit_event(
            self.repo.db, AuditEvent.MAGIC_LINK_GENERATED, user_id=actor_id,
            details=f"target_user={user.id}",
        )
        await self.repo.db.commit()
        await self.repo.db.refresh(user)
        return user, token_raw

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self.repo.get_user_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado")
        return user

    async def list_users(
        self,
        state: UserState | None,
        role: Role | None,
        page: int,
        limit: int,
        actor_id: uuid.UUID,
    ) -> tuple[list[User], int]:
        users, total = await self.repo.list_users(state, role, page, limit)
        add_audit_event(self.repo.db, AuditEvent.USER_LIST_QUERIED, user_id=actor_id)
        await self.repo.db.commit()
        return users, total

    async def update_user_status(
        self,
        user_id: uuid.UUID,
        new_state: UserState,
        actor_id: uuid.UUID,
        ip: str = "",
    ) -> User:
        if user_id == actor_id and new_state == UserState.disabled:
            raise ForbiddenError("No puedes desactivarte a ti mismo")

        if new_state == UserState.disabled:
            target = await self.repo.get_user_by_id(user_id)
            if target is not None and target.role == Role.superadmin:
                if await self.repo.count_active_superadmins() <= 1:
                    raise ConflictError("No se puede desactivar el único superadmin activo")

        user = await self.repo.update_user_state(user_id, new_state)

        if new_state in (UserState.disabled, UserState.deleted):
            await self.repo.revoke_all_user_tokens(user_id)
            await invalidate_cached_permissions(self.redis, user_id)

        add_audit_event(
            self.repo.db, AuditEvent.USER_STATE_CHANGED, user_id=actor_id, ip=ip,
            details=f"target={user_id} new_state={new_state}",
        )
        await self.repo.db.commit()
        await self.repo.db.refresh(user)
        return user

    async def soft_delete_user(
        self,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        ip: str = "",
    ) -> None:
        user = await self.repo.get_user_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado")
        if user.role == Role.superadmin and await self.repo.count_active_superadmins() <= 1:
            raise ConflictError("No se puede eliminar el único superadmin activo")

        await self.repo.soft_delete_user(user_id)
        await self.repo.revoke_all_user_tokens(user_id)
        await invalidate_cached_permissions(self.redis, user_id)

        add_audit_event(
            self.repo.db, AuditEvent.USER_DELETED, user_id=actor_id, ip=ip,
            details=f"target={user_id}",
        )
        await self.repo.db.commit()

    # ── Magic Link ────────────────────────────────────────────────────────────

    async def activate_magic_link(self, token_raw: str, ip: str = "") -> User:
        """
        Consumes a magic link token: marks it used and activates the user.
        Returns 410 on any invalid/expired/already-used condition (CA-MAGIC-02, CA-MAGIC-03).
        """
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()
        ml = await self.repo.get_magic_link_by_hash(token_hash)
        now = datetime.now(tz=timezone.utc)

        if ml is None or not ml.is_valid(now):
            raise AppError("Enlace inválido o expirado", status_code=410)

        await self.repo.mark_magic_link_used(ml.id)
        await self.repo.update_user_state(ml.user_id, UserState.active)

        user = await self.repo.get_user_by_id(ml.user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado")

        add_audit_event(self.repo.db, AuditEvent.MAGIC_LINK_USED, user_id=ml.user_id, ip=ip)
        await self.repo.db.commit()
        await self.repo.db.refresh(user)
        return user

    async def regenerate_magic_link(
        self,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
    ) -> tuple[User, str]:
        user = await self.repo.get_user_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado")

        await self.repo.invalidate_user_magic_links(user_id)
        token_raw, token_hash = self._generate_magic_link_token()
        await self.repo.save_magic_link(user_id, token_hash, self._magic_link_expires_at())

        add_audit_event(
            self.repo.db, AuditEvent.MAGIC_LINK_GENERATED, user_id=actor_id,
            details=f"target_user={user_id}",
        )
        await self.repo.db.commit()
        await self.repo.db.refresh(user)
        return user, token_raw

    # ── Autenticación ─────────────────────────────────────────────────────────

    async def login(self, email: str, password: str, ip: str = "") -> TokenResponse:
        """
        Superadmin-only password login.
        Returns the same generic 401 for all failure modes (anti-fingerprinting).
        """
        await self._check_login_rate_limit(ip, email)

        user = await self.repo.get_user_by_email(email)

        if user is None:
            add_audit_event(self.repo.db, AuditEvent.LOGIN_FAILED, ip=ip,
                            details="email_not_found")
            await self.repo.db.commit()
            raise UnauthorizedError("Credenciales inválidas")

        password_ok = (
            user.password_hash is not None
            and bcrypt.checkpw(password.encode(), user.password_hash.encode())
        )
        if not password_ok:
            add_audit_event(self.repo.db, AuditEvent.LOGIN_FAILED, user_id=user.id, ip=ip,
                            details="invalid_password")
            await self.repo.db.commit()
            raise UnauthorizedError("Credenciales inválidas")

        if user.state != UserState.active:
            add_audit_event(self.repo.db, AuditEvent.LOGIN_FAILED, user_id=user.id, ip=ip,
                            details=f"state={user.state}")
            await self.repo.db.commit()
            raise UnauthorizedError("Credenciales inválidas")

        token, _jti, _exp = create_access_token(
            user_id=user.id,
            role=str(user.role),
            token_version=user.token_version,
            pwd_changed_at=user.password_changed_at,
        )
        add_audit_event(self.repo.db, AuditEvent.LOGIN, user_id=user.id, ip=ip)
        await self.repo.db.commit()

        return TokenResponse(
            access_token=token,
            expires_in=settings.jwt_expire_seconds,
            user=TokenUserInfo(id=user.id, role=user.role),
        )

    async def oidc_callback(self, code: str, ip: str = "") -> TokenResponse:
        """Researcher/applicator OIDC login via Keycloak code exchange."""
        try:
            claims = await self.keycloak.exchange_code(code)
        except Exception:
            add_audit_event(self.repo.db, AuditEvent.OIDC_CALLBACK_FAILED, ip=ip)
            await self.repo.db.commit()
            raise UnauthorizedError("Autenticación OIDC fallida")

        sub = claims.get("sub", "")
        email = claims.get("email", "")

        user = await self.repo.get_user_by_email(email)
        if user is None:
            add_audit_event(self.repo.db, AuditEvent.OIDC_CALLBACK_FAILED, ip=ip,
                            details="user_not_found")
            await self.repo.db.commit()
            raise UnauthorizedError("Autenticación OIDC fallida")

        if user.broker_subject is None:
            # First OIDC login: link Keycloak subject to local user
            await self.repo.set_broker_subject(user.id, sub)
        elif user.broker_subject != sub:
            add_audit_event(self.repo.db, AuditEvent.OIDC_CALLBACK_FAILED, user_id=user.id,
                            ip=ip, details="sub_mismatch")
            await self.repo.db.commit()
            raise UnauthorizedError("Autenticación OIDC fallida")

        if user.state != UserState.active:
            add_audit_event(self.repo.db, AuditEvent.OIDC_CALLBACK_FAILED, user_id=user.id,
                            ip=ip, details=f"state={user.state}")
            await self.repo.db.commit()
            raise UnauthorizedError("Autenticación OIDC fallida")

        token, _jti, _exp = create_access_token(
            user_id=user.id,
            role=str(user.role),
            token_version=user.token_version,
        )
        add_audit_event(self.repo.db, AuditEvent.OIDC_LOGIN, user_id=user.id, ip=ip)
        await self.repo.db.commit()

        return TokenResponse(
            access_token=token,
            expires_in=settings.jwt_expire_seconds,
            user=TokenUserInfo(id=user.id, role=user.role),
        )

    async def logout(
        self,
        jti: uuid.UUID,
        exp: datetime,
        user_id: uuid.UUID,
        ip: str = "",
    ) -> None:
        await self.repo.revoke_token(jti, exp, user_id)
        add_audit_event(self.repo.db, AuditEvent.LOGOUT, user_id=user_id, ip=ip)
        await self.repo.db.commit()

    # ── Contraseña ────────────────────────────────────────────────────────────

    async def change_password(
        self,
        user_id: uuid.UUID,
        current_password: str,
        new_password: str,
        ip: str = "",
    ) -> None:
        """Only superadmin has a password; researcher/applicator use OIDC."""
        user = await self.repo.get_user_by_id(user_id)
        if user is None:
            raise NotFoundError("Usuario no encontrado")
        if user.role != Role.superadmin:
            raise ForbiddenError("Solo superadmin puede cambiar contraseña")
        if user.password_hash is None:
            raise AppError("El usuario no tiene contraseña configurada", status_code=400)
        if not bcrypt.checkpw(current_password.encode(), user.password_hash.encode()):
            raise UnauthorizedError("Contraseña actual incorrecta")
        if current_password == new_password:
            raise AppError("La nueva contraseña debe ser diferente a la actual", status_code=400)

        new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt(rounds=12)).decode()
        await self.repo.update_password(user_id, new_hash)
        add_audit_event(self.repo.db, AuditEvent.PASSWORD_CHANGED, user_id=user_id, ip=ip)
        await self.repo.db.commit()

    # ── Email ─────────────────────────────────────────────────────────────────

    async def approve_email_change(
        self,
        user_id: uuid.UUID,
        new_email: str,
        actor_id: uuid.UUID,
        ip: str = "",
    ) -> tuple[User, str]:
        existing = await self.repo.get_user_by_email(new_email)
        if existing is not None and existing.id != user_id:
            raise ConflictError("El email ya está registrado")

        user = await self.repo.update_user_email(user_id, new_email)
        # Invalidate all active sessions (broker_subject already cleared in update_user_email)
        await self.repo.revoke_all_user_tokens(user_id)
        await invalidate_cached_permissions(self.redis, user_id)

        # User must re-activate via a new magic link (OIDC re-linking flow)
        token_raw, token_hash = self._generate_magic_link_token()
        await self.repo.save_magic_link(user_id, token_hash, self._magic_link_expires_at())

        add_audit_event(self.repo.db, AuditEvent.EMAIL_CHANGED, user_id=actor_id, ip=ip,
                        details=f"target_user={user_id}")
        add_audit_event(self.repo.db, AuditEvent.MAGIC_LINK_GENERATED, user_id=actor_id,
                        details=f"target_user={user_id} (reactivation)")
        await self.repo.db.commit()
        await self.repo.db.refresh(user)
        return user, token_raw

    # ── Permisos ──────────────────────────────────────────────────────────────

    async def get_permissions(self, user_id: uuid.UUID) -> UserPermission | None:
        return await self.repo.get_user_permissions(user_id)

    async def upsert_permissions(
        self,
        user_id: uuid.UUID,
        actor_id: uuid.UUID,
        ip: str = "",
        **kwargs: object,
    ) -> UserPermission:
        perm = await self.repo.upsert_user_permissions(user_id, **kwargs)
        await invalidate_cached_permissions(self.redis, user_id)
        add_audit_event(
            self.repo.db, AuditEvent.PERMISSION_CHANGED, user_id=actor_id, ip=ip,
            details=f"target_user={user_id}",
        )
        await self.repo.db.commit()
        await self.repo.db.refresh(perm)
        return perm

    # ── Audit log ─────────────────────────────────────────────────────────────

    async def list_audit_log(
        self,
        event: str | None,
        user_id: uuid.UUID | None,
        from_dt: datetime | None,
        to_dt: datetime | None,
        page: int,
        limit: int,
    ) -> tuple[list[object], int]:
        return await self.repo.list_audit_log(event, user_id, from_dt, to_dt, page, limit)
