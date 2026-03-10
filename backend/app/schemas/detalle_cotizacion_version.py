from pydantic import BaseModel
from uuid import UUID
from typing import Optional

class DetalleCotizacionVersionBase(BaseModel):
    id_producto: UUID
    nombre_producto: str
    precio_unitario: float
    cantidad: int
    subtotal: float

    # 🔥 nullable
    nota_personalizable: Optional[str] = None


class DetalleCotizacionVersionCreate(DetalleCotizacionVersionBase):
    pass


class DetalleCotizacionVersionOut(DetalleCotizacionVersionBase):
    id_detalle_version: UUID
    id_version: UUID

    class Config:
        from_attributes = True