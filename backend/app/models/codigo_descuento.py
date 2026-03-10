import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base


class CodigoDescuento(Base):
    __tablename__ = "codigos_descuento"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    codigo = Column(String(80), unique=True, nullable=False, index=True)
    descripcion = Column(String, nullable=True)

    # porcentaje | fijo
    tipo = Column(String(20), nullable=False)
    valor = Column(Float, nullable=False)

    activo = Column(Boolean, nullable=False, default=True)
    fecha_expiracion = Column(DateTime, nullable=True)

    # opcional: cupón exclusivo por vendedor
    id_vendedor = Column(UUID(as_uuid=True), ForeignKey("vendedores.id_vendedor"), nullable=True)

    minimo_subtotal = Column(Float, nullable=True)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
