# app/schemas/vendedor.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime


class VendedorCreate(BaseModel):
    nombre: str
    telefono: str
    email: EmailStr
    nombre_negocio: str
    clave: str = Field(..., min_length=3, strip_whitespace=True)
    password: str  # ⚠️ solo se usa en entrada, no se guarda


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
    activo: bool
    created_at: datetime
    updated_at: datetime

    # Pydantic v2
    model_config = ConfigDict(from_attributes=True)
