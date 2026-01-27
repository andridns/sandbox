from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.services.currency import convert_currency
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/currency/convert")
async def convert_to_idr(
    amount: float = Query(..., description="Amount to convert"),
    from_currency: str = Query(..., description="Source currency code"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Convert an amount from any currency to IDR"""
    if from_currency.upper() == "IDR":
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": amount,
            "converted_currency": "IDR"
        }
    
    try:
        converted = await convert_currency(amount, from_currency, "IDR")
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": converted,
            "converted_currency": "IDR"
        }
    except Exception as e:
        # Fallback: return original if conversion fails
        return {
            "original_amount": amount,
            "original_currency": from_currency,
            "converted_amount": amount,
            "converted_currency": "IDR",
            "error": str(e)
        }
