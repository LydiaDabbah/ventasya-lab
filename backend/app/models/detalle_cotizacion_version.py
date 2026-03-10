# app/models/detalle_cotizacion_version.py
from sqlalchemy import Column, String, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

class DetalleCotizacionVersion(Base):
    __tablename__ = "detalle_cotizaciones_versiones"

    id_detalle_version = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_version = Column(UUID(as_uuid=True), ForeignKey("cotizaciones_versiones.id_version"), nullable=False)
    id_producto = Column(UUID(as_uuid=True), nullable=False)
    nombre_producto = Column(String, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    cantidad = Column(Integer, nullable=False)
    subtotal = Column(Float, nullable=True)

    # 🔥 NUEVO CAMPO (nullable)
    nota_personalizable = Column(String, nullable=True)

    version = relationship(
        "CotizacionVersion",
        back_populates="detalles",
        foreign_keys="DetalleCotizacionVersion.id_version"
    )