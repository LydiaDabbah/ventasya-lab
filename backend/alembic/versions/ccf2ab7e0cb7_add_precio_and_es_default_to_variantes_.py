"""Add precio and es_default to variantes_producto, remove precio_agregado

Revision ID: ccf2ab7e0cb7
Revises: 5551ee6dfd71
Create Date: 2025-07-01 21:58:54.362832

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ccf2ab7e0cb7'
down_revision: Union[str, Sequence[str], None] = '5551ee6dfd71'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Agregar columnas con server_default temporal
    op.add_column('variantes_producto', sa.Column('precio', sa.Float(), nullable=False, server_default='0.0'))
    op.add_column('variantes_producto', sa.Column('es_default', sa.Boolean(), nullable=False, server_default='false'))

    # 2. Opcional: Actualizar valores existentes si quieres valores distintos de default
    # Usa SQL directo si necesitas actualizar algún valor en especial, ej:
    # op.execute("UPDATE variantes_producto SET precio = 10.0 WHERE precio = 0.0")

    # 3. Eliminar columna precio_agregado
    op.drop_column('variantes_producto', 'precio_agregado')

    # 4. Quitar server_default si deseas (en una migración futura)
    # Esto no se hace aquí porque requiere crear una segunda migración posteriormente
    # para ALTER COLUMN y quitar server_default, dejando solo nullable=False


def downgrade() -> None:
    """Downgrade schema."""

    op.add_column('variantes_producto', sa.Column('precio_agregado', sa.DOUBLE_PRECISION(precision=53), autoincrement=False, nullable=True))
    op.drop_column('variantes_producto', 'es_default')
    op.drop_column('variantes_producto', 'precio')
