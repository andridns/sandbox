from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import bcrypt
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os
import secrets
from typing import Optional, Dict, List
from uuid import UUID
from google.oauth2 import id_token
from google.auth.transport.requests import Request as GoogleRequest
import warnings
import logging

from app.database import get_db
from app.models.user import User

# Suppress bcrypt version warnings from passlib
# These warnings are harmless - bcrypt 5.0+ works fine with passlib
warnings.filterwarnings("ignore", message=".*bcrypt.*")
warnings.filterwarnings("ignore", message=".*trapped.*")
warnings.filterwarnings("ignore", category=UserWarning, module="passlib")

# Password hashing - initialize with error handling for bcrypt compatibility
try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
except Exception:
    # Fallback initialization if default fails
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
    if not plain_password or not hashed_password:
        return False
    
    logger = logging.getLogger(__name__)
    
    # Try passlib first (suppress warnings during verification)
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", message=".*bcrypt.*")
        warnings.filterwarnings("ignore", message=".*trapped.*")
        try:
            result = pwd_context.verify(plain_password, hashed_password)
            if result:
                return True
        except Exception as e:
            logger.debug(f"Passlib verification failed: {e}, trying direct bcrypt")
    
    # Fallback to direct bcrypt if passlib fails or returns False
    try:
        # Handle both string and bytes hash formats
        if isinstance(hashed_password, str):
            hash_bytes = hashed_password.encode('utf-8')
        else:
            hash_bytes = hashed_password
        
        result = bcrypt.checkpw(plain_password.encode('utf-8'), hash_bytes)
        if result:
            logger.debug("Password verified using direct bcrypt")
        return result
    except Exception as e:
        # Log error for debugging but don't expose details
        logger.debug(f"Direct bcrypt verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """Hash a password"""
    try:
        return pwd_context.hash(password)
    except (ValueError, AttributeError):
        # Fallback to direct bcrypt if passlib fails
        password_bytes = password.encode('utf-8')
        # Bcrypt has a 72-byte limit
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')


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
    user_id_str = verify_session_token(token)
    if user_id_str is None:
        return None
    
    try:
        # Convert string to UUID
        user_id = UUID(user_id_str)
    except (ValueError, TypeError):
        # Invalid UUID format
        return None
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get current authenticated user"""
    logger = logging.getLogger(__name__)
    
    # Try to get token from cookie first (for web)
    token = request.cookies.get(SESSION_COOKIE_NAME)
    logger.debug(f"Cookie received: {SESSION_COOKIE_NAME}={token is not None}")
    logger.debug(f"All cookies: {list(request.cookies.keys())}")
    
    # If not in cookie, try Authorization header (for mobile/API)
    if not token:
        authorization_header = request.headers.get("Authorization")
        if authorization_header:
            # Handle "Bearer <token>" format
            if authorization_header.startswith("Bearer "):
                token = authorization_header.split("Bearer ")[1]
            else:
                token = authorization_header
            logger.info(f"Using Authorization header token (length: {len(token)})")
        else:
            logger.debug("No Authorization header found")
    
    if not token:
        auth_header_present = "Authorization" in request.headers
        logger.warning(
            f"No authentication token found. "
            f"Cookies: {list(request.cookies.keys())}, "
            f"Authorization header present: {auth_header_present}, "
            f"Origin: {request.headers.get('Origin')}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = get_current_user_from_token(token, db)
    if user is None:
        logger.warning("Invalid token provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def verify_google_token(id_token_str: str) -> Optional[Dict]:
    """Verify Google ID token and return user info"""
    try:
        google_client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not google_client_id:
            # Log warning for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("GOOGLE_CLIENT_ID not set in environment variables")
            # In development, you might want to skip verification
            # In production, this should always be set
            if os.getenv("ENVIRONMENT") == "development":
                # For development, decode without verification (not secure, but useful for testing)
                # In production, always verify
                return None
            raise ValueError("GOOGLE_CLIENT_ID not set")
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            id_token_str,
            GoogleRequest(),
            google_client_id
        )
        
        # Verify issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        return idinfo
    except ValueError as e:
        # Invalid token - log for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Google token verification failed (ValueError): {str(e)}")
        return None
    except Exception as e:
        # Other errors - log for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Google token verification failed (Exception): {str(e)}", exc_info=True)
        return None


def get_allowed_emails() -> List[str]:
    """Get list of allowed emails from environment variable"""
    allowed_emails_str = os.getenv("ALLOWED_EMAILS", "")
    if not allowed_emails_str:
        return []
    
    # Split by comma and strip whitespace
    emails = [email.strip() for email in allowed_emails_str.split(",") if email.strip()]
    return emails
