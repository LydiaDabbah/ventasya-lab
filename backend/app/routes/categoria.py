from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.database import get_db
from app.models.categoria import Categoria
from app.schemas.categoria import CategoriaCreate, CategoriaOut

router = APIRouter(prefix="/categorias", tags=["categorias"])

@router.post("/", response_model=CategoriaOut)
def crear_categoria(categoria: CategoriaCreate, db: Session = Depends(get_db)):
    nueva = Categoria(**categoria.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/{id_categoria}", response_model=CategoriaOut)
def obtener_categoria(id_categoria: UUID, db: Session = Depends(get_db)):
    return db.query(Categoria).filter_by(id_categoria=id_categoria).first()

@router.get("/por-vendedor/{id_vendedor}", response_model=list[CategoriaOut])
def obtener_categorias_por_vendedor(id_vendedor: UUID, db: Session = Depends(get_db)):
    return db.query(Categoria).filter_by(id_vendedor=id_vendedor, activo=True).order_by(Categoria.orden).all()
