from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session, select

from app.db.session import get_session
from app.db.models import User, StoreCredential
from app.services.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.rate_limit import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str


class StoreCredentialRequest(BaseModel):
    store_name: str
    email: str
    password: str


class StoreCredentialResponse(BaseModel):
    id: int
    store_name: str
    email: str


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def register(req: RegisterRequest, request: Request, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.username == req.username)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = User(username=req.username, hashed_password=hash_password(req.password))
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(req: LoginRequest, request: Request, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == req.username)).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, username=current_user.username)


@router.post("/credentials", response_model=StoreCredentialResponse, status_code=status.HTTP_201_CREATED)
def save_credential(
    req: StoreCredentialRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cred = StoreCredential(
        store_name=req.store_name,
        email=req.email,
        password=req.password,
        user_id=current_user.id,
    )
    session.add(cred)
    session.commit()
    session.refresh(cred)
    return StoreCredentialResponse(id=cred.id, store_name=cred.store_name, email=cred.email)


@router.get("/credentials", response_model=List[StoreCredentialResponse])
def list_credentials(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    creds = session.exec(select(StoreCredential).where(StoreCredential.user_id == current_user.id)).all()
    return [StoreCredentialResponse(id=c.id, store_name=c.store_name, email=c.email) for c in creds]


@router.delete("/credentials/{cred_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credential(
    cred_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    cred = session.exec(
        select(StoreCredential).where(StoreCredential.id == cred_id, StoreCredential.user_id == current_user.id)
    ).first()
    if not cred:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")
    session.delete(cred)
    session.commit()
