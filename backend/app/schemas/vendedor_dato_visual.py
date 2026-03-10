# app/schemas/vendedor_dato_visual.py
from pydantic import BaseModel, ConfigDict
from uuid import UUID
from enum import Enum
from app.enums.dato_visual import ClaveDatoVisualEnum


class VendedorDatoVisualBase(BaseModel):
    clave: ClaveDatoVisualEnum
    valor: str

class VendedorDatoVisualCreate(VendedorDatoVisualBase):
    id_vendedor: UUID

class VendedorDatoVisualOut(VendedorDatoVisualBase):
    id_dato: UUID
    id_vendedor: UUID

    model_config = ConfigDict(from_attributes=True)
