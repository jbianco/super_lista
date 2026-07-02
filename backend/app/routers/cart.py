import os
from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.db.session import get_session
from app.db.models import User
from app.services.auth import get_optional_user
from app.schemas import CartRequest, CartResponse
from app.services.cart import CartService
from app.services.automation import RealCartService, STORES_WITH_AUTOMATION

router = APIRouter(prefix="/api", tags=["cart"])

USE_REAL_CART = os.getenv("USE_REAL_CART", "false").lower() == "true"


@router.post("/cart", response_model=CartResponse)
async def add_to_cart(
    req: CartRequest,
    current_user: User | None = Depends(get_optional_user),
    session: Session = Depends(get_session),
):
    creds_dict = req.credentials.model_dump(exclude_none=True)
    items_dict = [i.model_dump() for i in req.items]

    if USE_REAL_CART and req.store_name in STORES_WITH_AUTOMATION:
        service = RealCartService()
    else:
        service = CartService()

    return await service.add_to_cart(req.store_name, creds_dict, items_dict)
