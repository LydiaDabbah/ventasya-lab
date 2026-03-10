from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import uuid4
from app.db.database import SessionLocal
from app.models.imagenes_producto import ImagenProducto
from app.schemas.imagen_producto import ImagenProductoCreate, ImagenProductoOut

router = APIRouter(prefix="/imagenes", tags=["ImagenesProducto"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ImagenProductoOut)
def agregar_imagen(imagen: ImagenProductoCreate, db: Session = Depends(get_db)):
    nueva = ImagenProducto(
        id_imagen=uuid4(),
        id_producto=imagen.id_producto,
        url=imagen.url,
        nota=imagen.nota,
        orden=imagen.orden
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

# ✅ NUEVA RUTA GET por id_producto
@router.get("/por-producto/{id_producto}", response_model=list[ImagenProductoOut])
def obtener_imagenes_por_producto(id_producto: str, db: Session = Depends(get_db)):
    imagenes = db.query(ImagenProducto).filter(ImagenProducto.id_producto == id_producto).all()
    return imagenes
