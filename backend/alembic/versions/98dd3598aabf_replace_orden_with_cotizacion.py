"""replace orden with cotizacion

Revision ID: 98dd3598aabf
Revises: 00a9525f1287
Create Date: 2026-02-27 12:19:21.274239
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "98dd3598aabf"
down_revision: Union[str, Sequence[str], None] = "00a9525f1287"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ============================================================
    # 1) DROP ordenes correctamente (dependientes primero)
    # ============================================================
    op.drop_table("direccion_orden")
    op.drop_table("detalle_ordenes")
    op.drop_table("ordenes")

    # ============================================================
    # 2) Asegurar tipos correctos en cotizaciones_versiones
    #    (dinero como NUMERIC(12,2), NO String)
    # ============================================================
    money = sa.Numeric(12, 2)

    # Si tu DB ya traía double precision, convertimos a numeric.
    # (Postgres puede castear double->numeric directo)
    op.alter_column(
        "cotizaciones_versiones",
        "descuento_aplicado",
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        type_=money,
        nullable=False,
        server_default="0",
    )

    op.alter_column(
        "cotizaciones_versiones",
        "costo_envio",
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        type_=money,
        nullable=False,
        server_default="0",
    )

    op.alter_column(
        "cotizaciones_versiones",
        "total",
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        type_=money,
        nullable=False,
        server_default="0",
    )

    # Estos campos los dejaste nullable en tu modelo -> OK.
    op.alter_column(
        "cotizaciones_versiones",
        "id_vendedor",
        existing_type=sa.UUID(),
        nullable=True,
    )
    op.alter_column(
        "cotizaciones_versiones",
        "telefono_cliente",
        existing_type=sa.VARCHAR(),
        nullable=True,
    )
    op.alter_column(
        "cotizaciones_versiones",
        "nombre_cliente",
        existing_type=sa.VARCHAR(),
        nullable=True,
    )

    # ============================================================
    # 3) No conviertas status a String si en tu modelo sigue siendo Enum
    #    (si tu modelo LO CAMBIÓ a String, esto te va a volver a salir
    #    en otro autogenerate — lo correcto es arreglar el modelo).
    # ============================================================
    # Si tu tabla cotizaciones ya tiene enum cotizacionstatusenum, lo dejamos tal cual.
    # Si autogenerate había puesto alter_column a String, LO QUITAMOS.

    # ============================================================
    # 4) editable_token_active debería ser NOT NULL con default true
    # ============================================================
    op.alter_column(
        "cotizaciones",
        "editable_token_active",
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text("true"),
    )

    # ============================================================
    # 5) FK cotizaciones_versiones -> cotizaciones
    #    (si tu autogenerate la tocó, la dejamos estable)
    # ============================================================
    # Si existe un constraint con nombre generado, a veces Alembic lo detecta distinto.
    # Esto es lo “safe”: dropear por nombre si existe (try/except).
    # Si ya te funciona sin esto, puedes borrar este bloque.
    try:
        op.drop_constraint(
            op.f("cotizaciones_versiones_id_cotizacion_fkey"),
            "cotizaciones_versiones",
            type_="foreignkey",
        )
    except Exception:
        pass

    op.create_foreign_key(
        op.f("cotizaciones_versiones_id_cotizacion_fkey"),
        "cotizaciones_versiones",
        "cotizaciones",
        ["id_cotizacion"],
        ["id_cotizacion"],
        ondelete="CASCADE",
    )

    # ============================================================
    # 6) detalle_cotizaciones_versiones.subtotal (si lo quieres NOT NULL)
    # ============================================================
    # En tu autogenerate lo cambió a nullable=True.
    # Para cotizaciones, subtotal debería ser NOT NULL.
    op.alter_column(
        "detalle_cotizaciones_versiones",
        "subtotal",
        existing_type=sa.DOUBLE_PRECISION(precision=53),
        type_=money,
        nullable=False,
        server_default="0",
    )


def downgrade() -> None:
    # ============================================================
    # Revertir cambios de tipos
    # ============================================================
    money = sa.Numeric(12, 2)

    op.alter_column(
        "detalle_cotizaciones_versiones",
        "subtotal",
        existing_type=money,
        type_=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=None,
    )

    # FK back (si quieres volver sin CASCADE)
    try:
        op.drop_constraint(
            op.f("cotizaciones_versiones_id_cotizacion_fkey"),
            "cotizaciones_versiones",
            type_="foreignkey",
        )
    except Exception:
        pass

    op.create_foreign_key(
        op.f("cotizaciones_versiones_id_cotizacion_fkey"),
        "cotizaciones_versiones",
        "cotizaciones",
        ["id_cotizacion"],
        ["id_cotizacion"],
        ondelete="CASCADE",
    )

    op.alter_column(
        "cotizaciones",
        "editable_token_active",
        existing_type=sa.BOOLEAN(),
        nullable=False,
        existing_server_default=sa.text("true"),
    )

    # Volver montos a DOUBLE PRECISION (como estaban)
    op.alter_column(
        "cotizaciones_versiones",
        "total",
        existing_type=money,
        type_=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=sa.text("'0'::double precision"),
    )
    op.alter_column(
        "cotizaciones_versiones",
        "costo_envio",
        existing_type=money,
        type_=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=sa.text("'0'::double precision"),
    )
    op.alter_column(
        "cotizaciones_versiones",
        "descuento_aplicado",
        existing_type=money,
        type_=sa.DOUBLE_PRECISION(precision=53),
        nullable=False,
        server_default=sa.text("'0'::double precision"),
    )

    op.alter_column(
        "cotizaciones_versiones",
        "nombre_cliente",
        existing_type=sa.VARCHAR(),
        nullable=False,
    )
    op.alter_column(
        "cotizaciones_versiones",
        "telefono_cliente",
        existing_type=sa.VARCHAR(),
        nullable=False,
    )
    op.alter_column(
        "cotizaciones_versiones",
        "id_vendedor",
        existing_type=sa.UUID(),
        nullable=False,
    )

    # ============================================================
    # Recrear ordenes (como lo traías antes)
    # ============================================================
    op.create_table(
        "ordenes",
        sa.Column("id_orden", sa.UUID(), nullable=False),
        sa.Column("numero_orden", sa.VARCHAR(), nullable=False),
        sa.Column("id_vendedor", sa.UUID(), nullable=False),
        sa.Column("telefono_cliente", sa.VARCHAR(), nullable=False),
        sa.Column("nombre_cliente", sa.VARCHAR(), nullable=False),
        sa.Column("email_cliente", sa.VARCHAR(), nullable=True),
        sa.Column("comentarios", sa.VARCHAR(), nullable=True),
        sa.Column("descuento_aplicado", sa.DOUBLE_PRECISION(precision=53), nullable=False),
        sa.Column("total", sa.DOUBLE_PRECISION(precision=53), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM("generada", "recibida", "pagada", "entregada", "cancelada", name="ordenstatusenum"),
            nullable=False,
        ),
        sa.Column("created_at", postgresql.TIMESTAMP(), nullable=False),
        sa.Column("updated_at", postgresql.TIMESTAMP(), nullable=False),
        sa.Column("costo_envio", sa.DOUBLE_PRECISION(precision=53), nullable=False),
        sa.Column("descripcion_envio", sa.VARCHAR(), nullable=True),
        sa.Column("editable_token", sa.VARCHAR(length=64), nullable=True),
        sa.Column("id_codigo_descuento", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["id_codigo_descuento"], ["codigos_descuento.id"]),
        sa.ForeignKeyConstraint(["id_vendedor"], ["vendedores.id_vendedor"]),
        sa.PrimaryKeyConstraint("id_orden"),
        sa.UniqueConstraint("editable_token"),
        sa.UniqueConstraint("numero_orden"),
    )

    op.create_table(
        "detalle_ordenes",
        sa.Column("id_detalle", sa.UUID(), nullable=False),
        sa.Column("id_orden", sa.UUID(), nullable=False),
        sa.Column("id_producto", sa.UUID(), nullable=False),
        sa.Column("nombre_producto", sa.VARCHAR(), nullable=False),
        sa.Column("precio_unitario", sa.DOUBLE_PRECISION(precision=53), nullable=False),
        sa.Column("cantidad", sa.INTEGER(), nullable=False),
        sa.Column("subtotal", sa.DOUBLE_PRECISION(precision=53), nullable=False),
        sa.ForeignKeyConstraint(["id_orden"], ["ordenes.id_orden"]),
        sa.ForeignKeyConstraint(["id_producto"], ["productos.id_producto"]),
        sa.PrimaryKeyConstraint("id_detalle"),
    )

    op.create_table(
        "direccion_orden",
        sa.Column("id_direccion", sa.UUID(), nullable=False),
        sa.Column("id_orden", sa.UUID(), nullable=False),
        sa.Column("nombre_receptor", sa.VARCHAR(), nullable=True),
        sa.Column("telefono_contacto", sa.VARCHAR(), nullable=True),
        sa.Column("calle", sa.VARCHAR(), nullable=True),
        sa.Column("numero_exterior", sa.VARCHAR(), nullable=True),
        sa.Column("numero_interior", sa.VARCHAR(), nullable=True),
        sa.Column("colonia", sa.VARCHAR(), nullable=True),
        sa.Column("delegacion_municipio", sa.VARCHAR(), nullable=True),
        sa.Column("estado", sa.VARCHAR(), nullable=True),
        sa.Column("codigo_postal", sa.VARCHAR(), nullable=True),
        sa.Column("referencia", sa.VARCHAR(), nullable=True),
        sa.Column("fecha_entrega", sa.DATE(), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(), nullable=False),
        sa.ForeignKeyConstraint(["id_orden"], ["ordenes.id_orden"]),
        sa.PrimaryKeyConstraint("id_direccion"),
    )