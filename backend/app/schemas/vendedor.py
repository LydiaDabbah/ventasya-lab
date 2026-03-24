from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator

from app.enums.moneda import MonedaEnum


class VendedorCreate(BaseModel):
    nombre: str
    telefono: str
    email: EmailStr
    nombre_negocio: str
    clave: str = Field(..., min_length=3)
    moneda: MonedaEnum = MonedaEnum.MXN
    password: str  # solo entrada

    @field_validator("clave")
    @classmethod
    def normalizar_clave(cls, value: str) -> str:
        value = (value or "").strip().lower()
        if len(value) < 3:
            raise ValueError("La clave debe tener al menos 3 caracteres")
        return value


class VendedorLogin(BaseModel):
    email: EmailStr
    password: str


class VendedorPasswordUpdate(BaseModel):
    email: EmailStr
    old_password: str
    new_password: str


class VendedorOut(BaseModel):
    id_vendedor: UUID
    nombre: str
    telefono: str
    email: EmailStr
    nombre_negocio: str
    clave: str
    moneda: MonedaEnum
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
