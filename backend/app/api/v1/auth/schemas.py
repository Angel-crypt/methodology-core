from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.db.models import Role, UserState


class UserCreateRequest(BaseModel):
    full_name: str
    email: EmailStr
    role: Role
    organization: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    full_name: str
    email: str
    role: Role
    organization: str
    state: UserState
    created_at: datetime
    broker_subject: str | None = None


class UserCreateResponse(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: Role
    organization: str
    state: UserState
    created_at: datetime
    _mock_magic_link: str | None = None


class UserStatusUpdateRequest(BaseModel):
    state: UserState


class UserStatusResponse(BaseModel):
    user_id: str
    email: str
    state: UserState
    updated_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int = 21600
    state: str


class LogoutResponse(BaseModel):
    message: str = "Session closed"


class UserListQuery(BaseModel):
    state: UserState | None = None
    role: Role | None = None
    page: int = 1
    limit: int = 20


class UserListMeta(BaseModel):
    total: int
    page: int
    limit: int
    pages: int


class UserListResponse(BaseModel):
    data: list[UserResponse]
    meta: UserListMeta


class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    data: dict | None = None


class SuccessResponse(BaseModel):
    status: str = "success"
    message: str
    data: dict | list | None = None