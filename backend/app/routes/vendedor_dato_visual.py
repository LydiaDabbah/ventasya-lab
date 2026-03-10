from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.vendedor_dato_visual import VendedorDatoVisual
from app.schemas.vendedor_dato_visual import VendedorDatoVisualCreate, VendedorDatoVisualOut
from uuid import uuid4, UUID

router = APIRouter(prefix="/vendedor-datos", tags=["vendedor_dato_visual"])

@router.post("/", response_model=VendedorDatoVisualOut)
def crear_dato(dato: VendedorDatoVisualCreate, db: Session = Depends(get_db)):
    nuevo = VendedorDatoVisual(**dato.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/por-vendedor/{id_vendedor}", response_model=list[VendedorDatoVisualOut])
def listar_datos_por_vendedor(id_vendedor: UUID, db: Session = Depends(get_db)):
    return db.query(VendedorDatoVisual).filter_by(id_vendedor=id_vendedor).all()

@router.post("/bulk", response_model=list[VendedorDatoVisualOut])
def crear_datos_visuales_bulk(
    datos: list[VendedorDatoVisualCreate],
    db: Session = Depends(get_db)
):
    nuevos = []
    for dato in datos:
        existente = (
            db.query(VendedorDatoVisual)
            .filter_by(id_vendedor=dato.id_vendedor, clave=dato.clave)
            .first()
        )
        if existente:
            existente.valor = dato.valor
        else:
            nuevos.append(VendedorDatoVisual(
                id_dato=uuid4(),
                id_vendedor=dato.id_vendedor,
                clave=dato.clave.value,
                valor=dato.valor
            ))

    if nuevos:
        db.add_all(nuevos)
    db.commit()

    return db.query(VendedorDatoVisual).filter(
        VendedorDatoVisual.id_vendedor.in_([d.id_vendedor for d in datos])
    ).all()
