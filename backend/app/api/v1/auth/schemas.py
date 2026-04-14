from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.db.models import Role, UserState


class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Role
    organization: Optional[str] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    full_name: str
    email: str
    role: Role
    organization: Optional[str]
    state: UserState
    broker_subject: Optional[str]
    created_at: datetime
    updated_at: datetime


class UserCreateResponse(BaseModel):
    user: UserResponse
    _mock_magic_link: str


class UserStatusUpdateRequest(BaseModel):
    state: UserState


class UserStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    state: UserState


class LoginRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutResponse(BaseModel):
    message: str


class UserListQuery(BaseModel):
    state: Optional[UserState] = None
    role: Optional[Role] = None
    page: int = 1
    limit: int = 20


class UserListMeta(BaseModel):
    total: int
    page: int
    limit: int
    total_pages: int


class UserListResponse(BaseModel):
    users: list[UserResponse]
    meta: UserListMeta


class ErrorResponse(BaseModel):
    detail: str


class SuccessResponse(BaseModel):
    message: str
    data: Optional[dict] = None


class EmailChangeRequest(BaseModel):
    new_email: EmailStr


class MagicLinkResponse(BaseModel):
    _mock_magic_link: str