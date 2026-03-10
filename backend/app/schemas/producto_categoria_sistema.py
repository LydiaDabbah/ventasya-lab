from pydantic import BaseModel
from uuid import UUID
from enum import Enum
from datetime import datetime
from app.enums.categoria_sistema import CategoriaSistemaEnum


class ProductoCategoriaSistemaBase(BaseModel):
    id_producto: UUID
    id_vendedor: UUID
    categoria: CategoriaSistemaEnum


class ProductoCategoriaSistemaCreate(ProductoCategoriaSistemaBase):
    pass


class ProductoCategoriaSistemaOut(ProductoCategoriaSistemaBase):
    id: UUID
   
    class Config:
        from_attributes = True
