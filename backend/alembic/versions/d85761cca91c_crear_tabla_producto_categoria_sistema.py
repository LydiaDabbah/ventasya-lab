"""crear tabla producto_categoria_sistema

Revision ID: d85761cca91c
Revises: d82ca6cbb056
Create Date: 2025-06-25 13:11:16.054494
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = 'd85761cca91c'
down_revision: Union[str, Sequence[str], None] = 'd82ca6cbb056'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'producto_categoria_sistema',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('id_producto', sa.UUID(), nullable=False),
        sa.Column('categoria', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['id_producto'], ['productos.id_producto']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id_producto', 'categoria', name='uq_producto_categoria_sistema')
    )

def downgrade() -> None:
    op.drop_table('producto_categoria_sistema')
