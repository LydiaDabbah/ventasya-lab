from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.database import Base
from app.enums.envio import DescripcionEnvioEnum


class CotizacionVersion(Base):
    __tablename__ = "cotizaciones_versiones"

    id_version = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)

    id_cotizacion = Column(
        UUID(as_uuid=True),
        ForeignKey("cotizaciones.id_cotizacion", ondelete="CASCADE"),
        nullable=False,
    )

    version_number = Column(Integer, nullable=False)
    numero_cotizacion = Column(String, nullable=False)

    id_vendedor = Column(UUID(as_uuid=True), nullable=True)

    telefono_cliente = Column(String, nullable=True)
    nombre_cliente = Column(String, nullable=True)
    email_cliente = Column(String, nullable=True)
    comentarios = Column(String, nullable=True)

    id_codigo_descuento = Column(UUID(as_uuid=True), nullable=True)

    descuento_aplicado = Column(Numeric(12, 2), nullable=False, server_default="0")
    costo_envio = Column(Numeric(12, 2), nullable=False, server_default="0")
    total = Column(Numeric(12, 2), nullable=False, server_default="0")

    # ✅ ahora usa enum
    descripcion_envio = Column(
        Enum(DescripcionEnvioEnum, name="descripcion_envio_enum"),
        nullable=False,
        server_default=DescripcionEnvioEnum.por_definir.value,
    )

    direccion = Column(Text, nullable=True)

    created_at = Column(DateTime, nullable=False, server_default=func.now())

    cotizacion = relationship(
        "Cotizacion",
        back_populates="versiones",
        foreign_keys="[CotizacionVersion.id_cotizacion]",
    )

    detalles = relationship(
        "DetalleCotizacionVersion",
        back_populates="version",
        foreign_keys="[DetalleCotizacionVersion.id_version]",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )