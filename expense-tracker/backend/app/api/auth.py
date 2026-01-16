from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse
from app.core.auth import (
    verify_password,
    create_session_token,
    get_current_user,
    SESSION_COOKIE_NAME,
    SESSION_EXPIRE_HOURS
)
from datetime import timedelta
import os

router = APIRouter()
security = HTTPBearer(auto_error=False)


@router.post("/auth/login", response_model=UserResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with username and password"""
    user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Create session token
    session_token = create_session_token(str(user.id))
    
    # Set secure cookie for web clients (sticky session)
    # Use secure=True only in production (when HTTPS is available)
    is_production = os.getenv("ENVIRONMENT", "development") == "production"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        max_age=SESSION_EXPIRE_HOURS * 3600,  # Convert hours to seconds
        httponly=True,
        secure=is_production,  # Set to True in production with HTTPS
        samesite="lax",  # Works for both same-site and cross-site requests
        path="/"
    )
    
    return user


@router.post("/auth/logout")
async def logout(response: Response):
    """Logout and clear session cookie"""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        samesite="lax"
    )
    return {"message": "Logged out successfully"}


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information"""
    return current_user
