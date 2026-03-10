import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class ProductoDatoAdicional(Base):
    __tablename__ = "producto_dato_adicional"

    id_dato = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto"), nullable=False)

    tipo = Column(String, nullable=False)  # No Enum en DB, solo texto
    valor = Column(String, nullable=False)
    orden = Column(Integer, nullable=True)

    __table_args__ = (
            UniqueConstraint('id_producto', 'tipo', name='uq_producto_tipo'),
        )