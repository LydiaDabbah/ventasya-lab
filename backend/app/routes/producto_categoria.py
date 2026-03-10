from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.producto_categoria import ProductoCategoria
from app.models.producto import Producto  # ✅
from app.schemas.producto_categoria import ProductoCategoriaCreate, ProductoCategoriaOut

router = APIRouter(prefix="/producto-categorias", tags=["producto_categoria"])

@router.post("/", response_model=ProductoCategoriaOut)
def asignar_categoria(data: ProductoCategoriaCreate, db: Session = Depends(get_db)):
    relacion = ProductoCategoria(**data.dict())
    db.add(relacion)
    db.commit()
    return relacion

@router.delete("/", response_model=dict)
def eliminar_categoria(data: ProductoCategoriaCreate, db: Session = Depends(get_db)):
    relacion = db.query(ProductoCategoria).filter_by(
        id_producto=data.id_producto,
        id_categoria=data.id_categoria
    ).first()
    if relacion:
        db.delete(relacion)
        db.commit()
    return {"ok": True}

@router.post("/bulk", response_model=dict)
def asignar_categorias_bulk(
    data: List[ProductoCategoriaCreate],
    db: Session = Depends(get_db),
):
    try:
        for item in data:
            existe = db.query(ProductoCategoria).filter_by(
                id_producto=item.id_producto,
                id_categoria=item.id_categoria
            ).first()
            if not existe:
                nueva = ProductoCategoria(**item.dict())
                db.add(nueva)
        db.commit()
        return {"ok": True, "mensaje": "Categorías asignadas"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/por-vendedor/{id_vendedor}", response_model=List[ProductoCategoriaOut])
def obtener_relaciones_por_vendedor(id_vendedor: str, db: Session = Depends(get_db)):
    return (
        db.query(ProductoCategoria)
        .join(Producto, ProductoCategoria.id_producto == Producto.id_producto)
        .filter(Producto.id_vendedor == id_vendedor)
        .all()
    )

@router.get("/por-categoria/{id_categoria}", response_model=List[ProductoCategoriaOut])
def obtener_productos_por_categoria(id_categoria: str, db: Session = Depends(get_db)):
    return db.query(ProductoCategoria).filter_by(id_categoria=id_categoria).all()
