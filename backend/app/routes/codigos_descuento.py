# app/routes/codigos_descuento.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from app.core.money import money
from app.db.database import SessionLocal
from app.models.codigo_descuento import CodigoDescuento
from app.schemas.codigo_descuento import CodigoDescuentoCreate, CodigoDescuentoOut

router = APIRouter(prefix="/codigos", tags=["Codigos"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _norm_code(code: str) -> str:
    return code.strip().upper()


def calcular_descuento_obj(codigo_obj: CodigoDescuento, subtotal: float, id_vendedor: Optional[str] = None) -> float:
    now = datetime.utcnow()

    if not codigo_obj.activo:
        raise HTTPException(status_code=400, detail="Código inactivo")

    if codigo_obj.fecha_expiracion and codigo_obj.fecha_expiracion < now:
        raise HTTPException(status_code=400, detail="Código expirado")

    if codigo_obj.id_vendedor and id_vendedor is not None and str(codigo_obj.id_vendedor) != str(id_vendedor):
        raise HTTPException(status_code=400, detail="Código no aplica para este vendedor")

    if codigo_obj.minimo_subtotal and subtotal < float(codigo_obj.minimo_subtotal):
        raise HTTPException(status_code=400, detail=f"El subtotal mínimo para este código es {codigo_obj.minimo_subtotal}")

    if (codigo_obj.tipo or "").lower() == "porcentaje":
        descuento = subtotal * (float(codigo_obj.valor or 0) / 100.0)
    else:
        descuento = float(codigo_obj.valor or 0)

    descuento = max(0.0, min(descuento, float(subtotal or 0.0)))
    return money(descuento)


@router.post("/", response_model=CodigoDescuentoOut)
def crear_codigo(payload: CodigoDescuentoCreate, db: Session = Depends(get_db)):
    code_norm = _norm_code(payload.codigo)
    existing = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
    if existing:
        raise HTTPException(status_code=400, detail="Código ya existe")

    nuevo = CodigoDescuento(
        codigo=code_norm,
        descripcion=payload.descripcion,
        tipo=payload.tipo,
        valor=payload.valor,
        activo=payload.activo if payload.activo is not None else True,
        fecha_expiracion=payload.fecha_expiracion,
        id_vendedor=payload.id_vendedor,
        minimo_subtotal=payload.minimo_subtotal,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(nuevo)
    try:
        db.commit()
        db.refresh(nuevo)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creando código: {str(e)}")

    return nuevo


@router.get("/", response_model=List[CodigoDescuentoOut])
def listar_codigos(activo: Optional[bool] = Query(None), id_vendedor: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(CodigoDescuento)
    if activo is not None:
        q = q.filter(CodigoDescuento.activo == activo)
    if id_vendedor:
        q = q.filter(CodigoDescuento.id_vendedor == id_vendedor)
    items = q.order_by(CodigoDescuento.created_at.desc()).all()
    return items


@router.get("/{codigo}", response_model=CodigoDescuentoOut)
def obtener_codigo(codigo: str, db: Session = Depends(get_db)):
    code_norm = _norm_code(codigo)
    c = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
    if not c:
        raise HTTPException(status_code=404, detail="Código no encontrado")
    return c


# Validate route -> devuelve id además del resto
from pydantic import BaseModel, Field
from typing import Any

class CodigoValidateRequest(BaseModel):
    codigo: str = Field(..., description="Código a validar")
    subtotal: float = Field(..., ge=0.0, description="Subtotal sobre el que aplicar")
    id_vendedor: Optional[str] = None


class CodigoValidateResponse(BaseModel):
    id: Optional[UUID] = None
    codigo: str
    descuento: float
    total_after: float
    tipo: str
    valor: float
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/validate", response_model=CodigoValidateResponse)
def validate_codigo(body: CodigoValidateRequest, db: Session = Depends(get_db)):
    code_norm = _norm_code(body.codigo)
    c = db.query(CodigoDescuento).filter(CodigoDescuento.codigo == code_norm).first()
    if not c:
        raise HTTPException(status_code=404, detail="Código no encontrado")

    descuento = calcular_descuento_obj(c, float(body.subtotal or 0.0), body.id_vendedor)
    total_after = max(0.0, float(body.subtotal or 0.0) - descuento)

    return {
        "id": c.id,
        "codigo": c.codigo,
        "descuento": float(descuento),
        "total_after": float(total_after),
        "tipo": c.tipo,
        "valor": float(c.valor),
        "descripcion": c.descripcion,
    }
