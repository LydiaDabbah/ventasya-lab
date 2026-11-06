from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.producto_datos_adicionales import ProductoDatoAdicional
from app.schemas.producto_datos_adicionales import (
    ProductoDatoAdicionalCreate,
    ProductoDatoAdicionalOut,
)
from app.models.producto import Producto
from app.core.auth import get_current_vendedor, require_vendedor_id

router = APIRouter(prefix="/producto-datos-adicionales", tags=["producto_datos_adicionales"])

# 🔷 Crear un dato adicional
@router.post("/", response_model=ProductoDatoAdicionalOut)
def create_dato(data: ProductoDatoAdicionalCreate, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    if not db.query(Producto).filter(Producto.id_producto == data.id_producto, Producto.id_vendedor == require_vendedor_id(auth)).first():
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    # Validación opcional: no duplicar orden en el mismo producto
    if data.orden is not None:
        existente = db.query(ProductoDatoAdicional).filter_by(
            id_producto=data.id_producto,
            orden=data.orden
        ).first()
        if existente:
            raise HTTPException(
                status_code=400,
                detail=f"Ya existe un dato con orden {data.orden} en este producto."
            )

    dato = ProductoDatoAdicional(**data.dict())
    db.add(dato)
    db.commit()
    db.refresh(dato)
    return dato

# 🔷 Obtener todos los datos de un producto
@router.get("/por-producto/{id_producto}", response_model=List[ProductoDatoAdicionalOut])
def get_datos_por_producto(id_producto: str, db: Session = Depends(get_db)):
    return (
        db.query(ProductoDatoAdicional)
        .filter_by(id_producto=id_producto)
        .order_by(ProductoDatoAdicional.orden, ProductoDatoAdicional.id_dato)
        .all()
    )

# 🔷 Eliminar un dato adicional por ID
@router.delete("/{id_dato}", response_model=dict)
def delete_dato(id_dato: str, db: Session = Depends(get_db), auth=Depends(get_current_vendedor)):
    dato = db.query(ProductoDatoAdicional).join(Producto, Producto.id_producto == ProductoDatoAdicional.id_producto).filter(ProductoDatoAdicional.id_dato == id_dato, Producto.id_vendedor == require_vendedor_id(auth)).first()
    if not dato:
        raise HTTPException(status_code=404, detail="Dato no encontrado")
    db.delete(dato)
    db.commit()
    return {"ok": True}

# 🔷 Crear muchos datos adicionales (bulk)
@router.post("/bulk", response_model=dict)
def create_datos_bulk(
    data: List[ProductoDatoAdicionalCreate],
    db: Session = Depends(get_db),
    auth=Depends(get_current_vendedor),
):
    try:
        for item in data:
            if not db.query(Producto).filter(Producto.id_producto == item.id_producto, Producto.id_vendedor == require_vendedor_id(auth)).first():
                raise HTTPException(status_code=404, detail="Producto no encontrado")
            dato = ProductoDatoAdicional(**item.dict())
            db.add(dato)
        db.commit()
        return {"ok": True, "mensaje": f"{len(data)} datos adicionales creados"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
