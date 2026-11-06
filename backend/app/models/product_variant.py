import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class ProductOption(Base):
    __tablename__ = "producto_opciones"

    id_opcion = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto", ondelete="CASCADE"), nullable=False)
    nombre = Column(String(80), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    producto = relationship("Producto", back_populates="opciones")
    valores = relationship(
        "ProductOptionValue", back_populates="opcion", cascade="all, delete-orphan",
        order_by="ProductOptionValue.orden", lazy="selectin"
    )

    __table_args__ = (UniqueConstraint("id_producto", "nombre", name="uq_producto_opcion_nombre"),)


class ProductOptionValue(Base):
    __tablename__ = "producto_opcion_valores"

    id_valor = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_opcion = Column(UUID(as_uuid=True), ForeignKey("producto_opciones.id_opcion", ondelete="CASCADE"), nullable=False)
    valor = Column(String(120), nullable=False)
    orden = Column(Integer, nullable=False, default=0)

    opcion = relationship("ProductOption", back_populates="valores")

    __table_args__ = (UniqueConstraint("id_opcion", "valor", name="uq_opcion_valor"),)


class ProductVariantValue(Base):
    __tablename__ = "producto_variante_valores"

    id_variante = Column(UUID(as_uuid=True), ForeignKey("producto_variantes.id_variante", ondelete="CASCADE"), primary_key=True)
    id_valor = Column(UUID(as_uuid=True), ForeignKey("producto_opcion_valores.id_valor", ondelete="CASCADE"), primary_key=True)


class ProductVariant(Base):
    __tablename__ = "producto_variantes"

    id_variante = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto", ondelete="CASCADE"), nullable=False)
    sku = Column(String(120), nullable=True, unique=True)
    precio = Column(Float, nullable=True)
    stock = Column(Integer, nullable=False, default=0)
    activo = Column(Boolean, nullable=False, default=True)
    imagen_url = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    producto = relationship("Producto", back_populates="variantes")
    valores = relationship("ProductOptionValue", secondary="producto_variante_valores", lazy="selectin")

    __table_args__ = (CheckConstraint("stock >= 0", name="ck_producto_variantes_stock_nonnegative"),)
