from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    username: str
    password: str


class GoogleTokenRequest(BaseModel):
    id_token: str


class UserResponse(BaseModel):
    id: UUID
    username: Optional[str] = None
    email: Optional[str] = None
    is_active: bool
    token: Optional[str] = None  # Bearer token for cross-site cookie fallback

    class Config:
        from_attributes = True
