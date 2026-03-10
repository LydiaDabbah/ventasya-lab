"""descripcion_envio enum

Revision ID: fad5e86e269d
Revises: d62de84e6508
Create Date: 2026-03-09 12:43:55.347883
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers
revision: str = "fad5e86e269d"
down_revision: Union[str, Sequence[str], None] = "d62de84e6508"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enum de Postgres
descripcion_envio_enum = postgresql.ENUM(
    "por_definir",
    "incluido",
    "monto_fijo",
    name="descripcion_envio_enum",
)


def upgrade() -> None:
    """Upgrade schema."""

    # 1️⃣ crear enum
    descripcion_envio_enum.create(op.get_bind(), checkfirst=True)

    # 2️⃣ borrar valores viejos (como dijiste que no importa)
    op.execute(
        """
        UPDATE cotizaciones_versiones
        SET descripcion_envio = NULL
        """
    )

    # 3️⃣ convertir columna a enum
    op.alter_column(
        "cotizaciones_versiones",
        "descripcion_envio",
        existing_type=sa.String(),
        type_=descripcion_envio_enum,
        existing_nullable=True,
        nullable=True,
        postgresql_using="NULL::descripcion_envio_enum",
    )


def downgrade() -> None:
    """Downgrade schema."""

    # volver a string
    op.alter_column(
        "cotizaciones_versiones",
        "descripcion_envio",
        type_=sa.String(),
        existing_nullable=True,
    )

    # borrar enum
    descripcion_envio_enum.drop(op.get_bind(), checkfirst=True)