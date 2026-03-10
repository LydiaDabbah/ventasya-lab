from uuid import UUID
from pydantic import BaseModel
from typing import Optional

class CategoriaBase(BaseModel):
    nombre: str
    orden: Optional[str] = None
    activo: bool = True
    imagen_url: Optional[str] = None  # ✅ Nueva columna

class CategoriaCreate(CategoriaBase):
    id_vendedor: UUID

class CategoriaOut(CategoriaBase):
    id_categoria: UUID
    id_vendedor: UUID

    class Config:
        from_attributes = True  # Para Pydantic v2
