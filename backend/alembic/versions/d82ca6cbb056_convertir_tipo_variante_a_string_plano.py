"""Convertir tipo_variante a string plano

Revision ID: d82ca6cbb056
Revises: c255988a7eb2
Create Date: 2025-06-24 21:47:31.185884
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd82ca6cbb056'
down_revision: Union[str, Sequence[str], None] = 'c255988a7eb2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Paso 1: eliminar columna con Enum (si ya existe)
    op.drop_column('variantes_producto', 'tipo_variante')

    # Paso 2: eliminar el tipo ENUM en PostgreSQL si existe
    op.execute("DROP TYPE IF EXISTS tipovarianteenum")

    # Paso 3: crear columna tipo_variante como texto plano
    op.add_column('variantes_producto', sa.Column('tipo_variante', sa.String(), nullable=False))


def downgrade() -> None:
    # Revertir el cambio: eliminar tipo_variante string
    op.drop_column('variantes_producto', 'tipo_variante')

    # Volver a crear el Enum si lo necesitas (opcional)
    op.execute("""
        CREATE TYPE tipovarianteenum AS ENUM (
            'sin_variante', 'color', 'talla', 'cantidad', 'sabor', 'material', 'otro'
        )
    """)
    op.add_column('variantes_producto', sa.Column(
        'tipo_variante', sa.Enum('sin_variante', 'color', 'talla', 'cantidad', 'sabor', 'material', 'otro',
                                 name='tipovarianteenum'), nullable=False
    ))
