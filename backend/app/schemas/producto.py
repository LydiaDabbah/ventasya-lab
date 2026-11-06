from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.variante_producto import ProductOptionInput, ProductOptionOut, ProductVariantInput, ProductVariantOut


class ProductoBase(BaseModel):
    nombre: str
    descripcion: str
    precio: float = Field(ge=0)
    imagen_url: str
    slug: Optional[str] = None
    sku: Optional[str] = None
    personalizable: bool = False
    stock: Optional[int] = Field(default=None, ge=0)


class ProductoCreate(ProductoBase):
    id_vendedor: UUID
    categorias_ids: Optional[List[UUID]] = None
    opciones: List[ProductOptionInput] = Field(default_factory=list)
    variantes: List[ProductVariantInput] = Field(default_factory=list)


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    precio: Optional[float] = None
    imagen_url: Optional[str] = None
    slug: Optional[str] = None
    sku: Optional[str] = None
    personalizable: Optional[bool] = None
    activo: Optional[bool] = None
    stock: Optional[int] = Field(default=None, ge=0)
    categorias_ids: Optional[List[UUID]] = None
    opciones: Optional[List[ProductOptionInput]] = None
    variantes: Optional[List[ProductVariantInput]] = None


class ProductoOut(ProductoBase):
    id_producto: UUID
    id_vendedor: UUID
    activo: bool
    created_at: datetime
    updated_at: datetime
    categorias_ids: Optional[List[UUID]] = None
    opciones: List[ProductOptionOut] = Field(default_factory=list)
    variantes: List[ProductVariantOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)
