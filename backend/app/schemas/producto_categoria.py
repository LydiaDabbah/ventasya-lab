# app/schemas/producto_categoria.py
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class ProductoCategoriaCreate(BaseModel):
    id_producto: UUID
    id_categoria: UUID

class ProductoCategoriaOut(ProductoCategoriaCreate):
    model_config = ConfigDict(from_attributes=True)
