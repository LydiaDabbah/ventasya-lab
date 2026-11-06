from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
from app.db.database import SessionLocal
from app.models.producto_categoria_sistema import ProductoCategoriaSistema
from app.schemas.producto_categoria_sistema import (
    ProductoCategoriaSistemaCreate,
    ProductoCategoriaSistemaOut,
)
from app.models.producto import Producto
from app.core.auth import get_current_vendedor, require_vendedor_id

router = APIRouter(prefix="/producto-categoria-sistema", tags=["ProductoCategoriaSistema"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ProductoCategoriaSistemaOut)
def asignar_categoria_sistema(
    data: ProductoCategoriaSistemaCreate, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)
):
    seller_id = require_vendedor_id(auth)
    if data.id_vendedor != seller_id or not db.query(Producto).filter(Producto.id_producto == data.id_producto, Producto.id_vendedor == seller_id).first():
        raise HTTPException(status_code=403, detail="No autorizado")
    existente = (
        db.query(ProductoCategoriaSistema)
        .filter_by(id_producto=data.id_producto, categoria=data.categoria.value)
        .first()
    )
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe esa categoría para el producto")

    nueva = ProductoCategoriaSistema(
        id=uuid4(),
        id_producto=data.id_producto,
        id_vendedor=data.id_vendedor,
        categoria=data.categoria.value,
       
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/por-vendedor/{id_vendedor}", response_model=list[ProductoCategoriaSistemaOut])
def obtener_por_vendedor(id_vendedor, db: Session = Depends(get_db)):
    return db.query(ProductoCategoriaSistema).filter_by(id_vendedor=id_vendedor).all()

@router.post("/bulk", response_model=list[ProductoCategoriaSistemaOut])
def asignar_categorias_sistema_bulk(
    datos: list[ProductoCategoriaSistemaCreate] = Body(...),
    db: Session = Depends(get_db),
    auth=Depends(get_current_vendedor),
):
    ahora = datetime.utcnow()
    nuevas = []

    for data in datos:
        seller_id = require_vendedor_id(auth)
        if data.id_vendedor != seller_id or not db.query(Producto).filter(Producto.id_producto == data.id_producto, Producto.id_vendedor == seller_id).first():
            raise HTTPException(status_code=403, detail="No autorizado")
        existente = (
            db.query(ProductoCategoriaSistema)
            .filter_by(id_producto=data.id_producto, categoria=data.categoria.value)
            .first()
        )

        if existente:
            existente.id_vendedor = data.id_vendedor
            existente.updated_at = ahora
            nuevas.append(existente)
        else:
            nueva = ProductoCategoriaSistema(
                id=uuid4(),
                id_producto=data.id_producto,
                id_vendedor=data.id_vendedor,
                categoria=data.categoria.value,
                
            )
            db.add(nueva)
            nuevas.append(nueva)

    db.commit()

    for n in nuevas:
        db.refresh(n)

    return nuevas
