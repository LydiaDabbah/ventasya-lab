import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime,UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class Vendedor(Base):
    __tablename__ = "vendedores"

    id_vendedor = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, nullable=False)
    nombre = Column(String, nullable=False)
    telefono = Column(String, nullable=False, unique=True)
    email = Column(String, nullable=False, unique=True)
    nombre_negocio = Column(String, nullable=False)  # tipo “Velas Romi”
    clave = Column(String, nullable=False, unique=True)  # tipo “velas-romi”
    activo = Column(Boolean, default=True)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (UniqueConstraint("clave", name="uq_vendedores_clave"),)