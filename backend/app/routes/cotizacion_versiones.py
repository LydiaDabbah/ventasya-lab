# app/routes/cotizacion_versiones.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Dict, Any
from datetime import datetime

from app.db.database import SessionLocal
from app.models.cotizacion import Cotizacion
from app.models.cotizacion_version import CotizacionVersion
from app.models.detalle_cotizacion_version import DetalleCotizacionVersion

router = APIRouter(prefix="/cotizaciones/versiones", tags=["CotizacionVersiones"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Listar versiones de una cotización (por id_cotizacion)
@router.get("/por-cotizacion/{id_cotizacion}", response_model=List[Dict[str, Any]])
def listar_versiones_por_cotizacion(id_cotizacion: UUID, db: Session = Depends(get_db)):
    cot = db.query(Cotizacion).filter(Cotizacion.id_cotizacion == id_cotizacion).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    versiones = db.query(CotizacionVersion).filter(CotizacionVersion.id_cotizacion == id_cotizacion).order_by(CotizacionVersion.version_number.asc()).all()
    out = []
    for v in versiones:
        detalles = db.query(DetalleCotizacionVersion).filter(DetalleCotizacionVersion.id_version == v.id_version).all()
        productos = [
            {
                "id_detalle_version": str(d.id_detalle_version),
                "id_producto": str(d.id_producto),
                "nombre_producto": d.nombre_producto,
                "precio_unitario": float(d.precio_unitario),
                "cantidad": int(d.cantidad),
                **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
            }
            for d in detalles
        ]

        out.append({
            "id_version": str(v.id_version),
            "id_cotizacion": str(v.id_cotizacion),
            "version_number": v.version_number,
            "numero_cotizacion": v.numero_cotizacion,
            "telefono_cliente": v.telefono_cliente,
            "nombre_cliente": v.nombre_cliente,
            "email_cliente": v.email_cliente,
            "direccion": v.direccion,
            "comentarios": v.comentarios,
            "id_codigo_descuento": str(getattr(v, "id_codigo_descuento", None)) if getattr(v, "id_codigo_descuento", None) else None,
            "descuento_aplicado": float(getattr(v, "descuento_aplicado", 0) or 0),
            "costo_envio": float(getattr(v, "costo_envio", 0) or 0),
            "descripcion_envio": v.descripcion_envio,
            "total": float(v.total),
            "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
            "productos": productos,
        })

    return out


# Obtener una versión por id_version
@router.get("/{id_version}", response_model=Dict[str, Any])
def obtener_version(id_version: UUID, db: Session = Depends(get_db)):
    v = db.query(CotizacionVersion).filter(CotizacionVersion.id_version == id_version).first()
    if not v:
        raise HTTPException(status_code=404, detail="Versión no encontrada")

    detalles = db.query(DetalleCotizacionVersion).filter(DetalleCotizacionVersion.id_version == v.id_version).all()
    productos = [
        {
            "id_detalle_version": str(d.id_detalle_version),
            "id_producto": str(d.id_producto),
            "nombre_producto": d.nombre_producto,
            "precio_unitario": float(d.precio_unitario),
            "cantidad": int(d.cantidad),
            **({"subtotal": float(d.subtotal)} if hasattr(d, "subtotal") else {}),
        }
        for d in detalles
    ]

    out = {
        "id_version": str(v.id_version),
        "id_cotizacion": str(v.id_cotizacion),
        "version_number": v.version_number,
        "numero_cotizacion": v.numero_cotizacion,
        "telefono_cliente": v.telefono_cliente,
        "nombre_cliente": v.nombre_cliente,
        "email_cliente": v.email_cliente,
        "direccion": v.direccion,
        "comentarios": v.comentarios,
        "id_codigo_descuento": str(getattr(v, "id_codigo_descuento", None)) if getattr(v, "id_codigo_descuento", None) else None,
        "descuento_aplicado": float(getattr(v, "descuento_aplicado", 0) or 0),
        "costo_envio": float(getattr(v, "costo_envio", 0) or 0),
        "descripcion_envio": v.descripcion_envio,
        "total": float(v.total),
        "created_at": v.created_at.isoformat() if getattr(v, "created_at", None) else None,
        "productos": productos,
    }

    return out


@router.patch("/activar/{id_version}", response_model=Dict[str, Any])
def activar_version(id_version: UUID, id_vendedor: str | None = Query(None), db: Session = Depends(get_db)):
    version = db.query(CotizacionVersion).filter(CotizacionVersion.id_version == id_version).first()
    if not version:
        raise HTTPException(status_code=404, detail="Versión no encontrada")

    cot = db.query(Cotizacion).filter(Cotizacion.id_cotizacion == version.id_cotizacion).first()
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    if id_vendedor and str(cot.id_vendedor) != str(id_vendedor):
        raise HTTPException(status_code=403, detail="No autorizado para modificar esta cotización")

    cot.current_version_id = version.id_version
    if hasattr(cot, "updated_at"):
        cot.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(cot)

    return {
        "mensaje": "Versión activada correctamente",
        "id_cotizacion": str(cot.id_cotizacion),
        "numero_cotizacion": cot.numero_cotizacion,
        "current_version_id": str(cot.current_version_id) if cot.current_version_id else None,
    }
