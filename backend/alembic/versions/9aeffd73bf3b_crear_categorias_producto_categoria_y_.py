"""crear categorias, producto_categoria y vendedor_dato_visual; eliminar logo_url

Revision ID: 9aeffd73bf3b
Revises: 349077f0891b
Create Date: 2025-06-24 17:19:08.111084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9aeffd73bf3b'
down_revision: Union[str, Sequence[str], None] = '349077f0891b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
