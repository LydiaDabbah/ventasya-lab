from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProductOptionInput(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    valores: List[str] = Field(min_length=1)

    @field_validator("nombre")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("valores")
    @classmethod
    def clean_values(cls, values: List[str]) -> List[str]:
        cleaned, seen = [], set()
        for value in values:
            normalized = str(value).strip()
            key = normalized.casefold()
            if normalized and key not in seen:
                cleaned.append(normalized)
                seen.add(key)
        if not cleaned:
            raise ValueError("Cada opción necesita al menos un valor")
        return cleaned


class ProductOptionValueOut(BaseModel):
    id_valor: UUID
    valor: str
    orden: int
    model_config = ConfigDict(from_attributes=True)


class ProductOptionOut(BaseModel):
    id_opcion: UUID
    nombre: str
    orden: int
    valores: List[ProductOptionValueOut]
    model_config = ConfigDict(from_attributes=True)


class ProductVariantInput(BaseModel):
    id_variante: Optional[UUID] = None
    opciones: Dict[str, str]
    sku: Optional[str] = None
    precio: Optional[float] = Field(default=None, ge=0)
    stock: int = Field(default=0, ge=0)
    activo: bool = True
    imagen_url: Optional[str] = None

    @field_validator("sku", "imagen_url")
    @classmethod
    def empty_to_none(cls, value: Optional[str]) -> Optional[str]:
        cleaned = (value or "").strip()
        return cleaned or None


class ProductVariantOut(ProductVariantInput):
    id_variante: UUID
