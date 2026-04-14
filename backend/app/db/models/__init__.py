from __future__ import annotations

from app.db.models.magic_link import MagicLink
from app.db.models.revoked_token import RevokedToken
from app.db.models.user import Role, User, UserState

__all__ = ["MagicLink", "RevokedToken", "Role", "User", "UserState"]