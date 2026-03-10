import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class ImagenProducto(Base):
    __tablename__ = "imagenes_producto"

    id_imagen = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    id_producto = Column(UUID(as_uuid=True), ForeignKey("productos.id_producto"), nullable=False)

    url = Column(String, nullable=False)
    nota = Column(String, nullable=True)
    orden = Column(String, nullable=True)  # si quieres ordenar el carrusel

   