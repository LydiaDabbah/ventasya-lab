# app/routes/detalle_cotizacion.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.db.database import SessionLocal
from app.models.detalle_cotizacion_version import DetalleCotizacionVersion
from app.schemas.detalle_cotizacion_version import DetalleCotizacionVersionOut

router = APIRouter(prefix="/detalle-cotizacion", tags=["DetalleCotizacion"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/por-cotizacion/{id_cotizacion}", response_model=list[DetalleCotizacionVersionOut])
def obtener_detalles(id_cotizacion: UUID, db: Session = Depends(get_db)):
    # buscamos la cotizacion y su current_version_id para devolver los detalles
    from app.models.cotizacion import Cotizacion
    cot = db.query(Cotizacion).filter(Cotizacion.id_cotizacion == id_cotizacion).first()
    if not cot or not getattr(cot, "current_version_id", None):
        return []

    detalles = (
        db.query(DetalleCotizacionVersion)
        .filter(DetalleCotizacionVersion.id_version == cot.current_version_id)
        .all()
    )

    if not detalles:
        return []
    
    return detalles
