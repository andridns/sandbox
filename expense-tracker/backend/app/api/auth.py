from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, UserResponse, GoogleTokenRequest
from app.core.auth import (
    verify_password,
    create_session_token,
    get_current_user,
    SESSION_COOKIE_NAME,
    SESSION_EXPIRE_HOURS,
    verify_google_token,
    get_allowed_emails
)
from datetime import timedelta
import os

router = APIRouter()
security = HTTPBearer(auto_error=False)


def is_production_environment() -> bool:
    """Check if running in production environment"""
    env = os.getenv("ENVIRONMENT", "").lower()
    # Check for production indicators:
    # 1. Explicit ENVIRONMENT=production
    # 2. Railway environment name (most reliable - Railway sets this to "production" in production)
    # 3. RAILWAY_ENVIRONMENT_NAME=production (Railway's built-in variable)
    # 4. Fallback: RAILWAY_PROJECT_ID exists (less reliable, exists in all Railway envs)
    railway_env_name = os.getenv("RAILWAY_ENVIRONMENT_NAME", "").lower()
    railway_env = os.getenv("RAILWAY_ENVIRONMENT", "").lower()
    railway_deployed = bool(os.getenv("RAILWAY_PROJECT_ID"))
    
    return (
        env == "production" 
        or railway_env_name == "production" 
        or railway_env == "production" 
        or railway_deployed
    )


@router.post("/auth/login", response_model=UserResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with username and password"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        user = db.query(User).filter(User.username == login_data.username).first()
        
        if not user:
            logger.warning(f"Login attempt with non-existent username: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        # Check if user has password (not OAuth-only user)
        if not user.password_hash:
            logger.warning(f"Login attempt for OAuth-only user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="This account uses Google Sign-In. Please use Google to sign in."
            )
        
        # Verify password
        password_valid = verify_password(login_data.password, user.password_hash)
        if not password_valid:
            logger.warning(f"Invalid password for user: {login_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password"
            )
        
        logger.info(f"Successful login for user: {login_data.username}")
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        # Create session token
        session_token = create_session_token(str(user.id))
        
        # Set secure cookie for web clients (sticky session)
        # Use secure=True only in production (when HTTPS is available)
        # samesite="none" is required for cross-site requests (frontend and backend on different domains)
        is_prod = is_production_environment()
        samesite_value = "none" if is_prod else "lax"
        # Log environment detection details for debugging
        env_vars = {
            "ENVIRONMENT": os.getenv("ENVIRONMENT"),
            "RAILWAY_ENVIRONMENT_NAME": os.getenv("RAILWAY_ENVIRONMENT_NAME"),
            "RAILWAY_ENVIRONMENT": os.getenv("RAILWAY_ENVIRONMENT"),
            "RAILWAY_PROJECT_ID": "SET" if os.getenv("RAILWAY_PROJECT_ID") else "NOT SET"
        }
        logger.info(f"Setting cookie: secure={is_prod}, samesite={samesite_value}, is_production={is_prod}, env_vars={env_vars}")
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=SESSION_EXPIRE_HOURS * 3600,  # Convert hours to seconds
            httponly=True,
            secure=is_prod,  # Set to True in production with HTTPS
            samesite=samesite_value,  # "none" required for cross-site requests in production
            path="/"
        )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        # Handle database errors (e.g., table doesn't exist) and other unexpected errors
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}. Please ensure migrations have been run."
        )


@router.post("/auth/logout")
async def logout(response: Response):
    """Logout and clear session cookie"""
    is_prod = is_production_environment()
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        samesite="none" if is_prod else "lax",
        secure=is_prod
    )
    return {"message": "Logged out successfully"}


@router.post("/auth/google", response_model=UserResponse)
async def google_login(
    token_data: GoogleTokenRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with Google OAuth token"""
    try:
        # Verify Google ID token
        google_user_info = verify_google_token(token_data.id_token)
        
        if not google_user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Google token"
            )
        
        email = google_user_info.get("email")
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )
        
        # Check if email is in allowed list
        allowed_emails = get_allowed_emails()
        if allowed_emails and email.lower() not in [e.lower() for e in allowed_emails]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your email is not authorized to access this application"
            )
        
        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user from Google account
            name = google_user_info.get("name", "")
            username = email.split("@")[0]  # Use email prefix as username
            
            # Ensure username is unique
            base_username = username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}{counter}"
                counter += 1
            
            user = User(
                username=username,
                email=email,
                password_hash=None,  # No password for OAuth users
                is_active=True,
                auth_provider="google"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Update existing user if needed
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is disabled"
                )
            # Update auth provider if it changed
            if user.auth_provider != "google":
                user.auth_provider = "google"
                db.commit()
        
        # Create session token
        session_token = create_session_token(str(user.id))
        
        # Set secure cookie
        # samesite="none" is required for cross-site requests (frontend and backend on different domains)
        is_prod = is_production_environment()
        samesite_value = "none" if is_prod else "lax"
        import logging
        logger = logging.getLogger(__name__)
        # Log environment detection details for debugging
        env_vars = {
            "ENVIRONMENT": os.getenv("ENVIRONMENT"),
            "RAILWAY_ENVIRONMENT_NAME": os.getenv("RAILWAY_ENVIRONMENT_NAME"),
            "RAILWAY_ENVIRONMENT": os.getenv("RAILWAY_ENVIRONMENT"),
            "RAILWAY_PROJECT_ID": "SET" if os.getenv("RAILWAY_PROJECT_ID") else "NOT SET"
        }
        logger.info(f"Setting cookie for Google login: secure={is_prod}, samesite={samesite_value}, is_production={is_prod}, env_vars={env_vars}")
        response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            max_age=SESSION_EXPIRE_HOURS * 3600,
            httponly=True,
            secure=is_prod,
            samesite=samesite_value,  # "none" required for cross-site requests in production
            path="/"
        )
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        # Log the full error for debugging
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Google authentication error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )


@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user information"""
    return current_user


@router.get("/auth/debug")
async def debug_auth_config(db: Session = Depends(get_db)):
    """Debug endpoint to check auth configuration (development only)"""
    if os.getenv("ENVIRONMENT") == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Debug endpoint not available in production"
        )
    
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    allowed_emails = get_allowed_emails()
    
    # Check admin user
    admin_user = db.query(User).filter(User.username == "admin").first()
    admin_info = None
    if admin_user:
        admin_info = {
            "exists": True,
            "is_active": admin_user.is_active,
            "has_password": bool(admin_user.password_hash),
            "password_hash_length": len(admin_user.password_hash) if admin_user.password_hash else 0,
            "password_hash_preview": admin_user.password_hash[:20] + "..." if admin_user.password_hash else None
        }
        
        # Test password verification
        from app.core.auth import verify_password
        test_password = os.getenv("DEFAULT_PASSWORD", "23052020")
        if admin_user.password_hash:
            admin_info["password_verification_test"] = verify_password(test_password, admin_user.password_hash)
    else:
        admin_info = {"exists": False}
    
    return {
        "google_client_id_set": bool(google_client_id),
        "google_client_id_preview": google_client_id[:20] + "..." if google_client_id else None,
        "allowed_emails_count": len(allowed_emails),
        "allowed_emails": allowed_emails,
        "admin_user": admin_info
    }
