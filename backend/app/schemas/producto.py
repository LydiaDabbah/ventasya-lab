from pydantic import BaseModel
from uuid import UUID
from typing import Optional


class ProductoBase(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    imagen_url: str
    slug: Optional[str] = None   # si viene vacío lo generamos en el router
    sku: Optional[str] = None    # opcional

    # ✅ NUEVO
    personalizable: bool = False


class ProductoCreate(ProductoBase):
    id_vendedor: UUID


class ProductoOut(ProductoBase):
    id_producto: UUID
    id_vendedor: UUID
    activo: bool

    class Config:
        from_attributes = True