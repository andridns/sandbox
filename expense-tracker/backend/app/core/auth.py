from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import secrets
from typing import Optional

from app.database import get_db
from app.models.user import User

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT/Session configuration
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
SESSION_COOKIE_NAME = "session_token"
SESSION_EXPIRE_HOURS = 24 * 7  # 7 days for sticky sessions

# Security scheme
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_session_token(user_id: str) -> str:
    """Create a JWT session token"""
    expire = datetime.utcnow() + timedelta(hours=SESSION_EXPIRE_HOURS)
    to_encode = {"sub": str(user_id), "exp": expire}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_session_token(token: str) -> Optional[str]:
    """Verify a session token and return user ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except JWTError:
        return None


def get_current_user_from_token(token: str, db: Session) -> Optional[User]:
    """Get user from session token"""
    user_id = verify_session_token(token)
    if user_id is None:
        return None
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    # Try to get token from cookie first (for web)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    
    # If not in cookie, try Authorization header (for mobile/API)
    if not token:
        authorization_header = request.headers.get("Authorization")
        if authorization_header:
            # Handle "Bearer <token>" format
            if authorization_header.startswith("Bearer "):
                token = authorization_header.split("Bearer ")[1]
            else:
                token = authorization_header
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_current_user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
