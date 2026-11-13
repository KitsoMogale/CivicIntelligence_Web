"""Initial knowledge schema; extensions require an appropriately privileged database role."""
from alembic import op
from backend.database import Base
revision = "001"
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=op.get_bind())
def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
