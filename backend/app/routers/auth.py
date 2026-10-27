from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session, select
from ..db.session import get_session
from ..models.schemas import User
from ..core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/auth", tags=["Autentifikatsiya"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    group_name: Optional[str] = "210-22"
    variant_number: int = 1
    role: Optional[str] = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token yaroqsiz yoki muddati o'tgan")
    email = payload.get("sub")
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    return user

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == req.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ushbu email bilan foydalanuvchi allaqachon mavjud")
        
    user = User(
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        group_name=req.group_name or "210-22",
        variant_number=req.variant_number,
        role=req.role or "student"
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    
    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "group_name": user.group_name,
            "variant_number": user.variant_number,
            "role": user.role
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email)).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Email yoki parol noto'g'ri")
        
    token = create_access_token({"sub": user.email, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "group_name": user.group_name,
            "variant_number": user.variant_number,
            "role": user.role
        }
    }

@router.get("/me")
def get_me(user: Optional[User] = Depends(get_current_user)):
    if not user:
        return {"guest": True, "role": "guest"}
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "group_name": user.group_name,
        "variant_number": user.variant_number,
        "role": user.role
    }
