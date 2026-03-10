from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List

from app.enums.envio import DescripcionEnvioEnum
from app.schemas.detalle_cotizacion_version import DetalleCotizacionVersionOut


class CotizacionVersionBase(BaseModel):
    numero_cotizacion: str
    id_vendedor: UUID

    telefono_cliente: Optional[str] = None
    nombre_cliente: Optional[str] = None
    email_cliente: Optional[str] = None
    comentarios: Optional[str] = None

    direccion: Optional[str] = None

    id_codigo_descuento: Optional[UUID] = None
    descuento_aplicado: float = 0.0

    costo_envio: float = 0.0

    descripcion_envio: DescripcionEnvioEnum = DescripcionEnvioEnum.por_definir

    total: float


class CotizacionVersionCreate(CotizacionVersionBase):
    id_cotizacion: UUID
    version_number: int


class CotizacionVersionOut(CotizacionVersionBase):
    id_version: UUID
    id_cotizacion: UUID
    version_number: int
    created_at: datetime
    detalles: List[DetalleCotizacionVersionOut] = []

    model_config = ConfigDict(from_attributes=True)