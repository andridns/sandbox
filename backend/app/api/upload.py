from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
import os
import uuid
import io
from pathlib import Path
from PIL import Image

from app.database import get_db
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter()

# Upload directory
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "receipts"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Max file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024

# Allowed extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


@router.post("/upload/receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a receipt image"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Read file content
    contents = await file.read()
    
    # Check file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # Validate image
    try:
        img = Image.open(io.BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Return URL path (relative to uploads directory)
    return {
        "url": f"/uploads/receipts/{filename}",
        "filename": filename
    }
