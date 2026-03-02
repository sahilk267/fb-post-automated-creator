"""
Single migration for content table: add columns that may be missing on existing DBs.
Source of truth for content columns: app.models.content.Content.
Columns added (idempotent, only if missing):
  schedule_at, schedule_meta_page_id, fb_page_id, fb_post_id, fb_status
  + index ix_content_fb_page_id.
New DBs created via init_db() already have these; use this for DBs created before they were added.
Run: python -m scripts.add_schedule_columns
Verify after: python -m scripts.check_db_schema
"""
import os
import sys

# Ensure app is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def main():
    import sqlite3
    from app.core.config import settings

    db_url = settings.database_url
    if not db_url.startswith("sqlite"):
        print("This script only supports SQLite. Your DATABASE_URL is not SQLite.")
        sys.exit(1)
    # sqlite:///./content_platform.db or sqlite:////app/data/content_platform.db
    path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if path.startswith("/"):
        # Absolute path (e.g. /app/data/content_platform.db in Docker)
        pass
    else:
        path = os.path.normpath(path)
        if not os.path.isabs(path):
            path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), path)
    if not os.path.isfile(path):
        print(f"Database file not found: {path}")
        print("Run the app or init_db first to create the database.")
        sys.exit(1)

    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Check existing columns
    cur.execute("PRAGMA table_info(content)")
    columns = {row[1] for row in cur.fetchall()}

    if "schedule_at" not in columns:
        cur.execute("ALTER TABLE content ADD COLUMN schedule_at DATETIME")
        print("Added column: content.schedule_at")
    else:
        print("Column content.schedule_at already exists.")

    if "schedule_meta_page_id" not in columns:
        # SQLite allows REFERENCES in ADD COLUMN; if it fails, add without FK
        try:
            cur.execute("ALTER TABLE content ADD COLUMN schedule_meta_page_id INTEGER REFERENCES meta_pages(id)")
        except sqlite3.OperationalError:
            cur.execute("ALTER TABLE content ADD COLUMN schedule_meta_page_id INTEGER")
        print("Added column: content.schedule_meta_page_id")
    else:
        print("Column content.schedule_meta_page_id already exists.")

    # Facebook post result columns (required by Content model)
    for col, sql_type in [
        ("fb_page_id", "VARCHAR(64)"),
        ("fb_post_id", "VARCHAR(128)"),
        ("fb_status", "VARCHAR(32)"),
    ]:
        if col not in columns:
            cur.execute(f"ALTER TABLE content ADD COLUMN {col} {sql_type}")
            print(f"Added column: content.{col}")
        else:
            print(f"Column content.{col} already exists.")

    conn.commit()

    # Optional: index on fb_page_id (idempotent)
    cur.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='ix_content_fb_page_id'")
    if cur.fetchone() is None:
        cur.execute("CREATE INDEX ix_content_fb_page_id ON content (fb_page_id)")
        print("Created index: ix_content_fb_page_id")
    conn.commit()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    main()
