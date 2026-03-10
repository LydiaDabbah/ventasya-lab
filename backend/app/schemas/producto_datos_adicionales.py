from pydantic import BaseModel
from uuid import UUID
from app.enums.tipo_dato import TipoDatoEnum  # 👈 Importa desde enums

class ProductoDatoAdicionalBase(BaseModel):
    tipo: TipoDatoEnum  # ✅ Usando el Enum del folder enums
    valor: str
    orden: int | None = None

class ProductoDatoAdicionalCreate(ProductoDatoAdicionalBase):
    id_producto: UUID

class ProductoDatoAdicionalOut(ProductoDatoAdicionalBase):
    id_dato: UUID
    id_producto: UUID

    class Config:
        from_attributes = True  # Pydantic v2 compatible
