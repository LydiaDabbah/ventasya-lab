"""product variants, inventory and quote snapshots

Revision ID: a41f0d9c7e21
Revises: 02d564f45183
Create Date: 2026-09-18
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "a41f0d9c7e21"
down_revision: Union[str, Sequence[str], None] = "02d564f45183"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("productos", sa.Column("stock", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_productos_stock_nonnegative", "productos", "stock >= 0")

    op.create_table(
        "producto_opciones",
        sa.Column("id_opcion", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("id_producto", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(80), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"], ondelete="CASCADE"),
        sa.UniqueConstraint("id_producto", "nombre", name="uq_producto_opcion_nombre"),
    )
    op.create_table(
        "producto_opcion_valores",
        sa.Column("id_valor", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("id_opcion", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("valor", sa.String(120), nullable=False),
        sa.Column("orden", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["id_opcion"], ["producto_opciones.id_opcion"], ondelete="CASCADE"),
        sa.UniqueConstraint("id_opcion", "valor", name="uq_opcion_valor"),
    )
    op.create_table(
        "producto_variantes",
        sa.Column("id_variante", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("id_producto", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sku", sa.String(120), nullable=True),
        sa.Column("precio", sa.Float(), nullable=True),
        sa.Column("stock", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("activo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("imagen_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"], ondelete="CASCADE"),
        sa.UniqueConstraint("sku", name="uq_producto_variantes_sku"),
        sa.CheckConstraint("stock >= 0", name="ck_producto_variantes_stock_nonnegative"),
    )
    op.create_index("ix_producto_variantes_producto", "producto_variantes", ["id_producto"])
    op.create_table(
        "producto_variante_valores",
        sa.Column("id_variante", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("id_valor", postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(["id_variante"], ["producto_variantes.id_variante"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["id_valor"], ["producto_opcion_valores.id_valor"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id_variante", "id_valor"),
    )

    op.add_column("detalle_cotizaciones_versiones", sa.Column("id_variante", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("detalle_cotizaciones_versiones", sa.Column("nombre_variante", sa.String(), nullable=True))
    op.add_column("detalle_cotizaciones_versiones", sa.Column("opciones_variante", postgresql.JSONB(), nullable=True))
    op.add_column("detalle_cotizaciones_versiones", sa.Column("sku_variante", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("detalle_cotizaciones_versiones", "sku_variante")
    op.drop_column("detalle_cotizaciones_versiones", "opciones_variante")
    op.drop_column("detalle_cotizaciones_versiones", "nombre_variante")
    op.drop_column("detalle_cotizaciones_versiones", "id_variante")
    op.drop_table("producto_variante_valores")
    op.drop_index("ix_producto_variantes_producto", table_name="producto_variantes")
    op.drop_table("producto_variantes")
    op.drop_table("producto_opcion_valores")
    op.drop_table("producto_opciones")
    op.drop_constraint("ck_productos_stock_nonnegative", "productos", type_="check")
    op.drop_column("productos", "stock")
