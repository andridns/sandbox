#!/usr/bin/env python3
"""
Script to update admin user password
Usage: poetry run python scripts/update_admin_password.py [new_password]
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.user import User
from app.core.auth import get_password_hash
import os

def update_admin_password(new_password: str = None):
    """Update admin user password"""
    if not new_password:
        new_password = os.getenv("DEFAULT_PASSWORD", "23052020")
    
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == "admin").first()
        
        if not user:
            print("❌ Admin user not found. Please run seed script first.")
            return False
        
        old_hash = user.password_hash
        user.password_hash = get_password_hash(new_password)
        user.is_active = True
        db.commit()
        
        print(f"✓ Updated admin password successfully")
        print(f"  Old hash: {old_hash[:30]}...")
        print(f"  New hash: {user.password_hash[:30]}...")
        return True
        
    except Exception as e:
        print(f"❌ Error updating password: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    new_password = sys.argv[1] if len(sys.argv) > 1 else None
    success = update_admin_password(new_password)
    sys.exit(0 if success else 1)
