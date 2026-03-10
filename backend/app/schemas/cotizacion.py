# app/schemas/cotizacion.py
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from enum import Enum

from app.schemas.detalle_cotizacion_version import (
    DetalleCotizacionVersionCreate,
    DetalleCotizacionVersionOut,
)


class CotizacionStatusEnum(str, Enum):
    generada = "generada"
    recibida = "recibida"
    pagada = "pagada"
    entregada = "entregada"
    cancelada = "cancelada"


class CotizacionCreate(BaseModel):
    id_vendedor: UUID
    telefono_cliente: str
    nombre_cliente: str
    email_cliente: Optional[str] = None
    comentarios: Optional[str] = None

    codigo_descuento: Optional[str] = None
    descuento_aplicado: Optional[float] = 0.0

    costo_envio: Optional[float] = 0.0
    descripcion_envio: Optional[str] = None

    total: float
    productos: List[DetalleCotizacionVersionCreate]


class CotizacionOut(BaseModel):
    id_cotizacion: UUID
    numero_cotizacion: str

    id_vendedor: UUID
    telefono_cliente: str
    nombre_cliente: str
    email_cliente: Optional[str]
    comentarios: Optional[str]

    codigo_descuento: Optional[str]
    descuento_aplicado: Optional[float]

    costo_envio: Optional[float]
    descripcion_envio: Optional[str]

    total: float
    status: CotizacionStatusEnum

    created_at: datetime
    updated_at: datetime

    editable_token: Optional[str] = None
    current_version_id: Optional[UUID] = None

    productos: List[DetalleCotizacionVersionOut]

    class Config:
        from_attributes = True
