from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class VarianteProductoBase(BaseModel):
    valor_variante: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    precio: float
    precio_descuento: Optional[float] = None
    es_default: bool = False
    activo: bool = True


class VarianteProductoCreate(VarianteProductoBase):
    id_producto: UUID


class VarianteProductoOut(VarianteProductoBase):
    id_variante: UUID
    id_producto: UUID
    created_at: datetime
    updated_at: datetime

    # ✔️ forma correcta en Pydantic v2
    model_config = ConfigDict(from_attributes=True)
