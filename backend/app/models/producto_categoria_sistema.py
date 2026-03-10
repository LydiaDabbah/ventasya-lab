import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey,UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base



class ProductoCategoriaSistema(Base):
    __tablename__ = "producto_categoria_sistema"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto"), nullable=False)
    id_vendedor = Column(UUID(as_uuid=True), nullable=False)  # No necesitas ForeignKey si no quieres forzar
    categoria = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint("id_producto", "categoria", name="uq_producto_categoria_sistema"),
    )
