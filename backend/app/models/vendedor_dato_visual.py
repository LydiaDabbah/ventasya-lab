import uuid
from enum import Enum
from sqlalchemy import Column, String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base



class VendedorDatoVisual(Base):
    __tablename__ = "vendedor_dato_visual"

    id_dato = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_vendedor = Column(UUID(as_uuid=True), ForeignKey("vendedores.id_vendedor"), nullable=False)

    clave = Column(String, nullable=False)  # validación se hace en schema (ver abajo)
    valor = Column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("id_vendedor", "clave", name="uq_vendedor_clave"),
    )
