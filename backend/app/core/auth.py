from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import HTTPException, Header
from uuid import UUID

from app.core.config import settings

ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_vendedor(authorization: str | None = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Autenticación requerida")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Esquema inválido")
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")
    try:
        payload["id_vendedor"] = str(UUID(str(payload.get("id_vendedor"))))
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Token inválido")
    return payload


def get_optional_vendedor(authorization: str | None = Header(None)):
    if not authorization:
        return None
    return get_current_vendedor(authorization)


def require_vendedor_id(payload: dict) -> UUID:
    return UUID(payload["id_vendedor"])
