"""Add sku, barcode, slug to productos and set NOT NULL constraints

Revision ID: 388cb38bfb44
Revises: e2afd8193a45
Create Date: 2025-06-27 20:33:48.009885

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String

# revision identifiers, used by Alembic.
revision: str = '388cb38bfb44'
down_revision: Union[str, Sequence[str], None] = 'e2afd8193a45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # ✅ Primero actualiza filas existentes para que no truene al poner NOT NULL
    productos = table('productos',
        column('sku', String),
        column('slug', String),
        column('descripcion', String),
        column('imagen_url', String),
    )

    op.execute(
        productos.update()
        .where(productos.c.sku == None)
        .values(sku='SKU-DUMMY')
    )

    op.execute(
        productos.update()
        .where(productos.c.slug == None)
        .values(slug='slug-dummy')
    )

    op.execute(
        productos.update()
        .where(productos.c.descripcion == None)
        .values(descripcion='Sin descripción')
    )

    op.execute(
        productos.update()
        .where(productos.c.imagen_url == None)
        .values(imagen_url='/placeholder.svg')
    )

    # ✅ Ahora altera columnas a NOT NULL
    op.alter_column('productos', 'sku', nullable=False)
    op.alter_column('productos', 'slug', nullable=False)
    op.alter_column('productos', 'descripcion', nullable=False)
    op.alter_column('productos', 'imagen_url', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""

    # 🔄 Revertir a nullable en downgrade
    op.alter_column('productos', 'imagen_url', nullable=True)
    op.alter_column('productos', 'descripcion', nullable=True)
    op.alter_column('productos', 'slug', nullable=True)
    op.alter_column('productos', 'sku', nullable=True)
