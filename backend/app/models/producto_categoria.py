from sqlalchemy import Column, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


class ProductoCategoria(Base):
    __tablename__ = "producto_categoria"

    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto"), primary_key=True)
    id_categoria = Column(UUID(as_uuid=True), ForeignKey("categorias.id_categoria"), primary_key=True)

    producto = relationship("Producto", back_populates="categorias_rel")