"""Remove server_default from precio and es_default in variantes_producto

Revision ID: 8d1715ed042f
Revises: ccf2ab7e0cb7
Create Date: 2025-07-01 22:02:05.246180

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d1715ed042f'
down_revision: Union[str, Sequence[str], None] = 'ccf2ab7e0cb7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
