from pydantic import BaseModel
from uuid import UUID
from typing import Optional, Dict

class DetalleCotizacionVersionBase(BaseModel):
    id_producto: UUID
    id_variante: Optional[UUID] = None
    nombre_producto: str
    precio_unitario: float
    cantidad: int
    subtotal: float
    nombre_variante: Optional[str] = None
    opciones_variante: Optional[Dict[str, str]] = None
    sku_variante: Optional[str] = None

    # 🔥 nullable
    nota_personalizable: Optional[str] = None


class DetalleCotizacionVersionCreate(DetalleCotizacionVersionBase):
    pass


class DetalleCotizacionVersionOut(DetalleCotizacionVersionBase):
    id_detalle_version: UUID
    id_version: UUID

    class Config:
        from_attributes = True
