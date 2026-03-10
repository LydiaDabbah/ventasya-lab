from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e2afd8193a45'
down_revision: Union[str, Sequence[str], None] = '584b5d628c72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # Agrega las columnas como NULLABLE inicialmente
    op.add_column('productos', sa.Column('sku', sa.String(), nullable=True))
    op.add_column('productos', sa.Column('barcode', sa.String(), nullable=True))
    op.add_column('productos', sa.Column('slug', sa.String(), nullable=True))

    # Si quieres, aquí podrías agregar un UPDATE con SQL para poblar slugs temporalmente,
    # o hacerlo después desde tu app

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('productos', 'slug')
    op.drop_column('productos', 'barcode')
    op.drop_column('productos', 'sku')
