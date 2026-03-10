"""add direccion to cotizaciones_versiones (force not-null for name/phone only)

Revision ID: 00a9525f1287
Revises: 82c6082be546
Create Date: 2026-02-20 13:27:12.719823
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '00a9525f1287'
down_revision: Union[str, Sequence[str], None] = '82c6082be546'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    - Agrega columna 'direccion' (nullable)
    - Rellena NULLs solo para nombre_cliente y telefono_cliente (placeholders)
    - Marca nombre_cliente y telefono_cliente como NOT NULL
    - No modifica email_cliente (permanece nullable)
    - Intenta crear FK/constraints de forma segura (best-effort)
    """
    # 1) Añadir columna 'direccion' (nullable)
    op.add_column('cotizaciones_versiones', sa.Column('direccion', sa.Text(), nullable=True))

    # 2) Rellenar NULLs para nombre_cliente y telefono_cliente con placeholders seguros
    #    (usarás email más tarde, por eso no lo tocamos)
    op.execute("""
        UPDATE cotizaciones_versiones
        SET nombre_cliente = 'sin-nombre'
        WHERE nombre_cliente IS NULL;
    """)
    op.execute("""
        UPDATE cotizaciones_versiones
        SET telefono_cliente = '0000000000'
        WHERE telefono_cliente IS NULL;
    """)

    # 3) Hacer NOT NULL en los dos campos requeridos
    op.alter_column(
        'cotizaciones_versiones',
        'nombre_cliente',
        existing_type=sa.VARCHAR(),
        nullable=False,
    )
    op.alter_column(
        'cotizaciones_versiones',
        'telefono_cliente',
        existing_type=sa.VARCHAR(),
        nullable=False,
    )

    # 4) Asegurar relaciones FK básicas (best-effort, nombres pueden variar en tu esquema)
    #    Intentamos dropear constraint antigua si existe y crear la nueva apuntando a id_version.
    try:
        op.drop_constraint(op.f('fk_cotizaciones_current_version'), 'cotizaciones', type_='foreignkey')
    except Exception:
        pass
    try:
        op.create_foreign_key(None, 'cotizaciones', 'cotizaciones_versiones', ['current_version_id'], ['id_version'])
    except Exception:
        # si falla, no rompemos la migración; la FK puede estar ya bien
        pass

    try:
        op.drop_constraint(op.f('detalle_cotizaciones_versiones_id_version_fkey'),
                           'detalle_cotizaciones_versiones', type_='foreignkey')
    except Exception:
        pass
    try:
        op.create_foreign_key(None, 'detalle_cotizaciones_versiones', 'cotizaciones_versiones', ['id_version'], ['id_version'])
    except Exception:
        pass


def downgrade() -> None:
    """
    Revert: permitir NULLs otra vez en nombre/telefono y eliminar direccion.
    (best-effort para FK)
    """
    # 1) permitir NULLs para nombre/telefono
    op.alter_column(
        'cotizaciones_versiones',
        'telefono_cliente',
        existing_type=sa.VARCHAR(),
        nullable=True,
    )
    op.alter_column(
        'cotizaciones_versiones',
        'nombre_cliente',
        existing_type=sa.VARCHAR(),
        nullable=True,
    )

    # 2) eliminar la columna direccion
    op.drop_column('cotizaciones_versiones', 'direccion')

    # 3) Restaurar FK names previos si aplica (best-effort)
    try:
        op.drop_constraint(None, 'detalle_cotizaciones_versiones', type_='foreignkey')
    except Exception:
        pass
    try:
        op.create_foreign_key(op.f('detalle_cotizaciones_versiones_id_version_fkey'),
                              'detalle_cotizaciones_versiones', 'cotizaciones_versiones',
                              ['id_version'], ['id_version'], ondelete='CASCADE')
    except Exception:
        pass

    try:
        op.drop_constraint(None, 'cotizaciones', type_='foreignkey')
    except Exception:
        pass
    try:
        op.create_foreign_key(op.f('fk_cotizaciones_current_version'), 'cotizaciones', 'cotizaciones_versiones',
                              ['current_version_id'], ['id_version'], ondelete='SET NULL')
    except Exception:
        pass