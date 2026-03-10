from pydantic import BaseModel
from uuid import UUID

class ImagenProductoBase(BaseModel):
    url: str
    nota: str | None = None
    orden: str | None = None

class ImagenProductoCreate(ImagenProductoBase):
    id_producto: UUID

class ImagenProductoOut(ImagenProductoBase):
    id_imagen: UUID
    id_producto: UUID

    class Config:
        from_attributes = True
