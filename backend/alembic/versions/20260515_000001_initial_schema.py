"""initial schema

Revision ID: 20260515_000001
Revises:
Create Date: 2026-05-15 00:00:01
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "20260515_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    dialect = op.get_bind().dialect.name
    uuid_type = sa.Uuid() if dialect != "postgresql" else postgresql.UUID(as_uuid=True)
    search_vector_type = postgresql.TSVECTOR() if dialect == "postgresql" else sa.Text()

    op.create_table(
        "users",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "notes",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("owner_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("content", sa.Text(), server_default="", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("is_pinned", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("search_vector", search_vector_type, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notes_owner_id", "notes", ["owner_id"], unique=False)
    if dialect == "postgresql":
        op.create_index("ix_notes_search_vector", "notes", ["search_vector"], unique=False, postgresql_using="gin")

    op.create_table(
        "tags",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("owner_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=50), nullable=False),
        sa.Column("color", sa.String(length=7), server_default="#6366f1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("owner_id", "name", name="uq_tags_owner_id_name"),
    )
    op.create_index("ix_tags_owner_id", "tags", ["owner_id"], unique=False)

    op.create_table(
        "note_tags",
        sa.Column("note_id", uuid_type, sa.ForeignKey("notes.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("tag_id", uuid_type, sa.ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )

    op.create_table(
        "note_shares",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("note_id", uuid_type, sa.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_with_id", uuid_type, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=10), server_default="viewer", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_viewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("note_id", "shared_with_id", name="uq_note_shares_note_id_shared_with_id"),
    )
    op.create_index("ix_note_shares_note_id", "note_shares", ["note_id"], unique=False)
    op.create_index("ix_note_shares_shared_with_id", "note_shares", ["shared_with_id"], unique=False)

    op.create_table(
        "note_versions",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("note_id", uuid_type, sa.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_num", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("note_id", "version_num", name="uq_note_versions_note_id_version_num"),
    )
    op.create_index("ix_note_versions_note_id", "note_versions", ["note_id"], unique=False)

    op.create_table(
        "public_links",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("note_id", uuid_type, sa.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_public_links_note_id", "public_links", ["note_id"], unique=False)
    op.create_index("ix_public_links_token", "public_links", ["token"], unique=True)

    op.create_table(
        "token_blacklist",
        sa.Column("id", uuid_type, primary_key=True, nullable=False),
        sa.Column("jti", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_token_blacklist_expires_at", "token_blacklist", ["expires_at"], unique=False)
    op.create_index("ix_token_blacklist_jti", "token_blacklist", ["jti"], unique=True)

    if dialect == "postgresql":
        op.execute(
            """
            CREATE FUNCTION notes_search_vector_update() RETURNS trigger AS $$
            BEGIN
              NEW.search_vector := to_tsvector('english',
                coalesce(NEW.title, '') || ' ' || coalesce(NEW.content, ''));
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
            """
        )
        op.execute(
            """
            CREATE TRIGGER notes_search_vector_trigger
            BEFORE INSERT OR UPDATE ON notes
            FOR EACH ROW EXECUTE FUNCTION notes_search_vector_update();
            """
        )


def downgrade() -> None:
    dialect = op.get_bind().dialect.name
    if dialect == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS notes_search_vector_trigger ON notes;")
        op.execute("DROP FUNCTION IF EXISTS notes_search_vector_update();")
    op.drop_index("ix_token_blacklist_jti", table_name="token_blacklist")
    op.drop_index("ix_token_blacklist_expires_at", table_name="token_blacklist")
    op.drop_table("token_blacklist")
    op.drop_index("ix_public_links_token", table_name="public_links")
    op.drop_index("ix_public_links_note_id", table_name="public_links")
    op.drop_table("public_links")
    op.drop_index("ix_note_versions_note_id", table_name="note_versions")
    op.drop_table("note_versions")
    op.drop_index("ix_note_shares_shared_with_id", table_name="note_shares")
    op.drop_index("ix_note_shares_note_id", table_name="note_shares")
    op.drop_table("note_shares")
    op.drop_table("note_tags")
    op.drop_index("ix_tags_owner_id", table_name="tags")
    op.drop_table("tags")
    if dialect == "postgresql":
        op.drop_index("ix_notes_search_vector", table_name="notes")
    op.drop_index("ix_notes_owner_id", table_name="notes")
    op.drop_table("notes")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
