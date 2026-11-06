import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, Float, DateTime, ForeignKey, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class Producto(Base):
    __tablename__ = "productos"

    id_producto = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    id_vendedor = Column(UUID(as_uuid=True), ForeignKey("vendedores.id_vendedor"), nullable=False)

    nombre = Column(String, nullable=False)
    descripcion = Column(String, nullable=False)
    precio = Column(Float, nullable=False)
    imagen_url = Column(String, nullable=False)
    slug = Column(String, nullable=False)

    # Si el producto permite personalización en cotización
    personalizable = Column(Boolean, nullable=False, default=False)

    # SKU opcional pero único
    sku = Column(String, unique=True, nullable=True)

    activo = Column(Boolean, nullable=False, default=True)
    # null conserva compatibilidad para productos cuyo inventario aún no se controla.
    stock = Column(Integer, nullable=True, default=None)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    categorias_rel = relationship(
        "ProductoCategoria",
        back_populates="producto",
        cascade="all, delete-orphan",
    )
    opciones = relationship(
        "ProductOption", back_populates="producto", cascade="all, delete-orphan",
        order_by="ProductOption.orden", lazy="selectin"
    )
    variantes = relationship(
        "ProductVariant", back_populates="producto", cascade="all, delete-orphan",
        order_by="ProductVariant.created_at", lazy="selectin"
    )

    __table_args__ = (CheckConstraint("stock >= 0", name="ck_productos_stock_nonnegative"),)
