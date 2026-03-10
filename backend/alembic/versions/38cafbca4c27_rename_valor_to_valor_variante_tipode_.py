from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '38cafbca4c27'
down_revision = '8d1715ed042f'
branch_labels = None
depends_on = None

def upgrade():
    # 🔧 Renombrar columna 'valor' a 'valor_variante'
    op.alter_column('variantes_producto', 'valor', new_column_name='valor_variante')

    # 🔧 Agregar columna 'tipo_variante' a productos (NOT NULL requiere default si ya hay filas)
    op.add_column('productos', sa.Column('tipo_variante', sa.String(), nullable=True))

    # Opcional: si ya hay productos existentes, asigna un valor default temporal
    op.execute("UPDATE productos SET tipo_variante = 'sin_variante' WHERE tipo_variante IS NULL")

    # Ahora establece como NOT NULL
    op.alter_column('productos', 'tipo_variante', nullable=False)


def downgrade():
    # 🔧 Revertir nombre de columna
    op.alter_column('variantes_producto', 'valor_variante', new_column_name='valor')

    # 🔧 Eliminar columna tipo_variante de productos
    op.drop_column('productos', 'tipo_variante')
