from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from app.services.cart import CartService


router = APIRouter(prefix="/api", tags=["cart"])


class CartCredentials(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    auth_method: Optional[str] = "password"
    token: Optional[str] = None


class CartRequest(BaseModel):
    store_name: str
    credentials: CartCredentials
    items: List[str]


class CartResponse(BaseModel):
    success: bool


@router.post("/cart", response_model=CartResponse)
async def add_to_cart(req: CartRequest):
    service = CartService()
    creds_dict = req.credentials.model_dump(exclude_none=True)
    success = await service.add_to_cart(
        req.store_name, creds_dict, req.items
    )
    return CartResponse(success=success)
