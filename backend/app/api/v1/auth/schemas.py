from __future__ import annotations

from pydantic import BaseModel


class UserCreateRequest(BaseModel):
    # TODO: campos derivados del contrato XML
    pass


class MagicLinkConsumeRequest(BaseModel):
    # TODO: campos derivados del contrato XML
    pass


class LoginRequest(BaseModel):
    # TODO: campos derivados del contrato XML
    pass


class TokenResponse(BaseModel):
    # TODO: campos derivados del contrato XML
    pass
