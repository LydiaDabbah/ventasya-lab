import uuid
from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from app.db.database import Base

class Categoria(Base):
    __tablename__ = "categorias"

    id_categoria = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_vendedor = Column(UUID(as_uuid=True), ForeignKey("vendedores.id_vendedor"), nullable=False)
    nombre = Column(String, nullable=False)
    imagen_url = Column(String, nullable=True)
    orden = Column(String, nullable=True)
    activo = Column(Boolean, nullable=False, default=True)  # ✅ borrado inteligente
