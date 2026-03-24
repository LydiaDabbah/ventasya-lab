from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProductoBase(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    imagen_url: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    personalizable: bool = False


class ProductoCreate(ProductoBase):
    id_vendedor: UUID
    categorias_ids: Optional[List[UUID]] = None


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    imagen_url: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    personalizable: Optional[bool] = None
    activo: Optional[bool] = None
    categorias_ids: Optional[List[UUID]] = None


class ProductoOut(ProductoBase):
    id_producto: UUID
    id_vendedor: UUID
    activo: bool
    created_at: datetime
    updated_at: datetime
    categorias_ids: Optional[List[UUID]] = None

    model_config = ConfigDict(from_attributes=True)