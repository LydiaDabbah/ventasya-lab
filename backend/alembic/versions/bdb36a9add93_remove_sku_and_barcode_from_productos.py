"""Move sku and barcode from productos to variantes_producto

Revision ID: bdb36a9add93
Revises: 388cb38bfb44
Create Date: 2025-06-27 20:43:32.509844

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'bdb36a9add93'
down_revision: Union[str, Sequence[str], None] = '388cb38bfb44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # 🔴 Borrar columnas de productos
    op.drop_column('productos', 'sku')
    op.drop_column('productos', 'barcode')

    # ✅ Agregar columnas en variantes_producto
    op.add_column('variantes_producto', sa.Column('sku', sa.String(), nullable=True))
    op.add_column('variantes_producto', sa.Column('barcode', sa.String(), nullable=True))

    # 🔒 Constraint de unicidad en sku de variantes
    op.create_unique_constraint('uq_variantes_producto_sku', 'variantes_producto', ['sku'])

def downgrade() -> None:
    """Downgrade schema."""
    # 🔙 Eliminar columnas de variantes_producto
    op.drop_constraint('uq_variantes_producto_sku', 'variantes_producto', type_='unique')
    op.drop_column('variantes_producto', 'barcode')
    op.drop_column('variantes_producto', 'sku')

    # 🔙 Restaurar columnas en productos
    op.add_column('productos', sa.Column('sku', sa.String(), nullable=True))
    op.add_column('productos', sa.Column('barcode', sa.String(), nullable=True))
