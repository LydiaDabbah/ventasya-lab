from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class CodigoDescuentoCreate(BaseModel):
    codigo: str
    descripcion: Optional[str] = None
    tipo: str
    valor: float
    activo: Optional[bool] = True
    fecha_expiracion: Optional[datetime] = None
    id_vendedor: Optional[UUID] = None
    minimo_subtotal: Optional[float] = None


class CodigoDescuentoOut(BaseModel):
    id: UUID
    codigo: str
    descripcion: Optional[str]
    tipo: str
    valor: float
    activo: bool
    fecha_expiracion: Optional[datetime]
    id_vendedor: Optional[UUID]
    minimo_subtotal: Optional[float]

    class Config:
        from_attributes = True
