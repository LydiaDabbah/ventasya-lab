"""add cotizaciones, cotizacion_versions y detalle_cotizacion_version

Revision ID: 2385e36879fb
Revises: 49639b5c0ee4
Create Date: 2026-02-19 13:48:03.577860

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


# revision identifiers, used by Alembic.
revision: str = '2385e36879fb'
down_revision: Union[str, Sequence[str], None] = '49639b5c0ee4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 0) crear tipo enum sólo si no existe (defensivo)
    op.execute("""
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cotizacionstatusenum') THEN
            CREATE TYPE cotizacionstatusenum AS ENUM ('generada','recibida','pagada','entregada','cancelada');
        END IF;
    END
    $$;
    """)

    # referencia Python para usar en columnas, pero NO pedirle a SQLAlchemy que cree el tipo
    status_enum = pg.ENUM('generada', 'recibida', 'pagada', 'entregada', 'cancelada', name='cotizacionstatusenum', create_type=False)

    # 1) Crear tabla 'cotizaciones' SIN FK hacia versiones (la añadiremos después)
    op.create_table(
        'cotizaciones',
        sa.Column('id_cotizacion', sa.UUID(), nullable=False),
        sa.Column('numero_cotizacion', sa.String(), nullable=False),
        sa.Column('id_vendedor', sa.UUID(), nullable=False),
        sa.Column('status', status_enum, nullable=False),
        sa.Column('editable_token', sa.String(length=128), nullable=True),
        sa.Column('editable_token_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('current_version_id', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['id_vendedor'], ['vendedores.id_vendedor']),
        sa.PrimaryKeyConstraint('id_cotizacion'),
        sa.UniqueConstraint('editable_token'),
        sa.UniqueConstraint('numero_cotizacion')
    )

    # 2) Crear tabla de versiones (cotizaciones_versiones)
    op.create_table(
        'cotizaciones_versiones',
        sa.Column('id_version', sa.UUID(), nullable=False),
        sa.Column('id_cotizacion', sa.UUID(), nullable=False),
        sa.Column('version_number', sa.Integer(), nullable=False),
        sa.Column('numero_cotizacion', sa.String(), nullable=False),
        sa.Column('id_vendedor', sa.UUID(), nullable=False),
        sa.Column('telefono_cliente', sa.String(), nullable=False),
        sa.Column('nombre_cliente', sa.String(), nullable=False),
        sa.Column('email_cliente', sa.String(), nullable=True),
        sa.Column('comentarios', sa.String(), nullable=True),
        sa.Column('id_codigo_descuento', sa.UUID(), nullable=True),
        sa.Column('descuento_aplicado', sa.Float(), nullable=False, server_default="0"),
        sa.Column('costo_envio', sa.Float(), nullable=False, server_default="0"),
        sa.Column('descripcion_envio', sa.String(), nullable=True),
        sa.Column('total', sa.Float(), nullable=False, server_default="0"),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['id_cotizacion'], ['cotizaciones.id_cotizacion'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_version')
    )

    # 3) Crear tabla de detalle de versiones
    op.create_table(
        'detalle_cotizaciones_versiones',
        sa.Column('id_detalle_version', sa.UUID(), nullable=False),
        sa.Column('id_version', sa.UUID(), nullable=False),
        sa.Column('id_producto', sa.UUID(), nullable=False),
        sa.Column('nombre_producto', sa.String(), nullable=False),
        sa.Column('precio_unitario', sa.Float(), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('subtotal', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['id_version'], ['cotizaciones_versiones.id_version'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_detalle_version')
    )

    # 4) Ahora que las versiones existen, añadir FK desde cotizaciones.current_version_id -> cotizaciones_versiones.id_version
    op.create_foreign_key(
        'fk_cotizaciones_current_version',
        source_table='cotizaciones',
        referent_table='cotizaciones_versiones',
        local_cols=['current_version_id'],
        remote_cols=['id_version'],
        ondelete='SET NULL'
    )


def downgrade() -> None:
    """Downgrade schema."""
    # quitar FK primero (si existe)
    try:
        op.drop_constraint('fk_cotizaciones_current_version', 'cotizaciones', type_='foreignkey')
    except Exception:
        pass

    # dropear tablas en orden (si existen)
    op.drop_table('detalle_cotizaciones_versiones')
    op.drop_table('cotizaciones_versiones')
    op.drop_table('cotizaciones')

    # eliminar tipo enum si existe (defensivo)
    op.execute("""
    DO $$
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cotizacionstatusenum') THEN
            DROP TYPE cotizacionstatusenum;
        END IF;
    END
    $$;
    """)
