from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.vendedor import Vendedor
from app.schemas.vendedor import VendedorPasswordUpdate
from passlib.context import CryptContext
from datetime import datetime
import uuid
from app.core.auth import create_access_token
from app.core.auth import get_current_vendedor, require_vendedor_id
from app.schemas.vendedor import VendedorCreate, VendedorOut, VendedorLogin, VendedorUpdate

router = APIRouter(prefix="/vendedores", tags=["Vendedores"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

@router.post("/", status_code=status.HTTP_201_CREATED)
def crear_vendedor(vendedor: VendedorCreate, db: Session = Depends(get_db)):
    # Verificar email o teléfono duplicados
    existe = db.query(Vendedor).filter(
        (Vendedor.email == vendedor.email) | (Vendedor.telefono == vendedor.telefono)
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Ya existe un vendedor con ese correo o teléfono")

    # Verificar clave duplicada
    clave_existente = db.query(Vendedor).filter(Vendedor.clave == vendedor.clave).first()
    if clave_existente:
        raise HTTPException(status_code=400, detail="Esa clave ya está ocupada. Usa otra URL para tu tienda.")

    nuevo = Vendedor(
        id_vendedor=uuid.uuid4(),
        nombre=vendedor.nombre,
        telefono=vendedor.telefono,
        email=vendedor.email,
        nombre_negocio=vendedor.nombre_negocio,
        clave=vendedor.clave.strip().lower(),  # limpia espacios y convierte a minúsculas
        moneda=vendedor.moneda,
        password_hash=hash_password(vendedor.password),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)

    # ✅ Genera el token con la info mínima
    token = create_access_token({"id_vendedor": str(nuevo.id_vendedor), "clave": nuevo.clave})

    # ✅ Devuelve token + datos básicos del vendedor
    return {
        "access_token": token,
        "token_type": "bearer",
        "vendedor": {
            "id_vendedor": nuevo.id_vendedor,
            "nombre": nuevo.nombre,
            "nombre_negocio": nuevo.nombre_negocio,
            "clave": nuevo.clave,
            "email": nuevo.email,
            "moneda": nuevo.moneda,
        }
    }


@router.get("/clave/{clave}", response_model=VendedorOut)
def obtener_vendedor_por_clave(clave: str, db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.clave == clave).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    return vendedor

@router.post("/login")
def login_vendedor(credentials: VendedorLogin, db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.email == credentials.email).first()
    if not vendedor:
        raise HTTPException(status_code=400, detail="Email incorrecto")
    if not pwd_context.verify(credentials.password, vendedor.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña incorrecta")
    
    # ✅ Genera el token con info mínima
    token = create_access_token({"id_vendedor": str(vendedor.id_vendedor), "clave": vendedor.clave})

    # ✅ Devuelve token + datos básicos del vendedor
    return {
        "access_token": token,
        "token_type": "bearer",
        "vendedor": {
            "id_vendedor": vendedor.id_vendedor,
            "nombre": vendedor.nombre,
            "nombre_negocio": vendedor.nombre_negocio,
            "clave": vendedor.clave,
            "email": vendedor.email,
            "moneda": vendedor.moneda,
        }
    }



@router.get("/protegida")
def ruta_protegida(vendedor = Depends(get_current_vendedor)):
    return {"mensaje": f"Hola {vendedor['clave']}, esta es una ruta protegida."}


@router.get("/me", response_model=VendedorOut)
def vendedor_actual(auth=Depends(get_current_vendedor), db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.id_vendedor == require_vendedor_id(auth)).first()
    if not vendedor or not vendedor.activo:
        raise HTTPException(status_code=401, detail="Vendedor no disponible")
    return vendedor


@router.patch("/me", response_model=VendedorOut)
def actualizar_vendedor(payload: VendedorUpdate, auth=Depends(get_current_vendedor), db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.id_vendedor == require_vendedor_id(auth)).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    data = payload.model_dump(exclude_unset=True)
    if "email" in data or "telefono" in data:
        duplicate = db.query(Vendedor).filter(
            Vendedor.id_vendedor != vendedor.id_vendedor,
            ((Vendedor.email == data.get("email")) if data.get("email") else False) |
            ((Vendedor.telefono == data.get("telefono")) if data.get("telefono") else False),
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="El correo o teléfono ya está en uso")
    for field, value in data.items():
        setattr(vendedor, field, value)
    vendedor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vendedor)
    return vendedor


@router.put("/password")
def actualizar_password(data: VendedorPasswordUpdate, auth=Depends(get_current_vendedor), db: Session = Depends(get_db)):
    vendedor = db.query(Vendedor).filter(Vendedor.id_vendedor == require_vendedor_id(auth)).first()
    if not vendedor:
        raise HTTPException(status_code=404, detail="Vendedor no encontrado")
    if str(vendedor.email).casefold() != str(data.email).casefold():
        raise HTTPException(status_code=403, detail="No autorizado")

    # ✅ Verifica la contraseña actual
    if not pwd_context.verify(data.old_password, vendedor.password_hash):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")

    # ✅ Actualiza con la nueva contraseña
    vendedor.password_hash = hash_password(data.new_password)
    vendedor.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(vendedor)

    return {"mensaje": "Contraseña actualizada correctamente"}
