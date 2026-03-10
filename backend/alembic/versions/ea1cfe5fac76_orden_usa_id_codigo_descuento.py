"""orden usa id_codigo_descuento

Revision ID: ea1cfe5fac76
Revises: eeca7301f70b
Create Date: 2026-02-18 12:57:24.572211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ea1cfe5fac76'
down_revision: Union[str, Sequence[str], None] = 'eeca7301f70b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # 1) Añadir columna nueva nullable (si no existe)
    cols = [c["name"] for c in inspector.get_columns("ordenes")]
    if "id_codigo_descuento" not in cols:
        op.add_column(
            "ordenes",
            sa.Column("id_codigo_descuento", postgresql.UUID(as_uuid=True), nullable=True),
        )

    # 2) Intentar popular id_codigo_descuento desde la columna texto existente
    #    sólo si la tabla codigo_descuento existe y tiene las columnas esperadas.
    tables = inspector.get_table_names()
    if "codigo_descuento" in tables:
        cols_codigo = [c["name"] for c in inspector.get_columns("codigo_descuento")]
        # asumimos que la tabla tiene columnas 'id' y 'codigo'
        if "id" in cols_codigo and "codigo" in cols_codigo:
            conn.execute(
                sa.text(
                    """
                    UPDATE ordenes o
                    SET id_codigo_descuento = c.id
                    FROM codigo_descuento c
                    WHERE trim(upper(o.codigo_descuento)) = trim(upper(c.codigo))
                    AND o.codigo_descuento IS NOT NULL
                    """
                )
            )
        else:
            print("Migration ea1cfe5fac76: tabla 'codigo_descuento' encontrada pero faltan columnas 'id' o 'codigo'. No se pobló automáticamente.")
    else:
        print("Migration ea1cfe5fac76: tabla 'codigo_descuento' no encontrada. Se creó la columna 'id_codigo_descuento' sin popular ni crear FK.")

    # 3) Crear FK hacia codigo_descuento.id si la tabla existe y tiene columna id
    if "codigo_descuento" in tables:
        cols_codigo = [c["name"] for c in inspector.get_columns("codigo_descuento")]
        if "id" in cols_codigo:
            try:
                op.create_foreign_key(
                    "fk_orden_codigo",
                    "ordenes",
                    "codigo_descuento",
                    ["id_codigo_descuento"],
                    ["id"],
                )
            except Exception as e:
                print(f"Migration ea1cfe5fac76: no se pudo crear FK fk_orden_codigo: {e}")
        else:
            print("Migration ea1cfe5fac76: 'codigo_descuento' sin columna 'id' — FK no creada.")

    # 4) Crear índice (si no existe)
    indexes = [ix["name"] for ix in inspector.get_indexes("ordenes")]
    if "ix_ordenes_id_codigo_descuento" not in indexes:
        op.create_index("ix_ordenes_id_codigo_descuento", "ordenes", ["id_codigo_descuento"])


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # quitar índice si existe
    try:
        indexes = [ix["name"] for ix in inspector.get_indexes("ordenes")]
        if "ix_ordenes_id_codigo_descuento" in indexes:
            op.drop_index("ix_ordenes_id_codigo_descuento", table_name="ordenes")
    except Exception:
        pass

    # quitar FK si existe
    try:
        fks = inspector.get_foreign_keys("ordenes")
        fk_names = [fk.get("name") for fk in fks if fk.get("name")]
        if "fk_orden_codigo" in fk_names:
            op.drop_constraint("fk_orden_codigo", "ordenes", type_="foreignkey")
    except Exception:
        pass

    # quitar columna si existe
    try:
        cols = [c["name"] for c in inspector.get_columns("ordenes")]
        if "id_codigo_descuento" in cols:
            op.drop_column("ordenes", "id_codigo_descuento")
    except Exception:
        pass
