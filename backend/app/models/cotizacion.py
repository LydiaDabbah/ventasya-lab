# app/models/cotizacion.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.db.database import Base

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id_cotizacion = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero_cotizacion = Column(String, unique=True, nullable=False)
    id_vendedor = Column(UUID(as_uuid=True), ForeignKey("vendedores.id_vendedor"), nullable=False)
    status = Column(String)  # o Enum si usas Enum
    editable_token = Column(String(128), unique=True, nullable=True)
    editable_token_active = Column(Boolean, default=True)
    current_version_id = Column(UUID(as_uuid=True), ForeignKey("cotizaciones_versiones.id_version"), nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)

    # RELACIONES (explicitas para evitar ambigüedad)
    # Todas las versiones relacionadas por su id_cotizacion -> Cotizacion.id_cotizacion
    versiones = relationship(
        "CotizacionVersion",
        back_populates="cotizacion",
        foreign_keys='[CotizacionVersion.id_cotizacion]',
        cascade="all, delete-orphan",
        order_by="CotizacionVersion.version_number"
    )

    # Relación al version actual referenciada por current_version_id -> cotizaciones_versiones.id_version
    current_version = relationship(
        "CotizacionVersion",
        uselist=False,
        foreign_keys='[Cotizacion.current_version_id]',
        primaryjoin="Cotizacion.current_version_id==CotizacionVersion.id_version",
    )
