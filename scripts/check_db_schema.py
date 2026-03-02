"""
Read-only database schema check. Ensures content table has all columns expected by
app.models.content.Content. Single source of truth: this list must match Content model.
Run: python -m scripts.check_db_schema
Uses DATABASE_URL from environment (or default sqlite). No changes made to DB.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Canonical list of content columns (must match app.models.content.Content)
CONTENT_EXPECTED_COLUMNS = [
    "id", "title", "body", "status", "created_by_id", "approved_by_id",
    "created_at", "updated_at", "approved_at",
    "fb_page_id", "fb_post_id", "fb_status",
    "schedule_at", "schedule_meta_page_id",
]


def get_db_path():
    from app.core.config import settings
    db_url = settings.database_url
    if not db_url.startswith("sqlite"):
        return None, "Only SQLite is supported for this check."
    path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if path.startswith("/"):
        pass
    else:
        path = os.path.normpath(path)
        if not os.path.isabs(path):
            path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), path)
    return path, None


def main():
    path, err = get_db_path()
    if err:
        print(err)
        sys.exit(1)
    if not os.path.isfile(path):
        print(f"Database file not found: {path}")
        print("Run the app or init_db first to create the database.")
        sys.exit(1)

    import sqlite3
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # List all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [row[0] for row in cur.fetchall()]
    print("Tables:", ", ".join(tables))

    # Check content table
    cur.execute("PRAGMA table_info(content)")
    rows = cur.fetchall()
    if not rows:
        print("ERROR: Table 'content' does not exist.")
        conn.close()
        sys.exit(1)

    actual = {row[1] for row in rows}
    expected = set(CONTENT_EXPECTED_COLUMNS)
    missing = expected - actual
    extra = actual - expected

    if not missing:
        if extra:
            print("content table: OK (all expected columns present). Extra columns (ignored by app):", ", ".join(sorted(extra)))
        else:
            print("content table: OK (all expected columns present, no extra columns).")
        conn.close()
        sys.exit(0)

    print("content table MISSING columns:", ", ".join(sorted(missing)))
    print("  -> Run: python -m scripts.add_schedule_columns")
    if extra:
        print("  Extra columns in DB (ignored by app):", ", ".join(sorted(extra)))
    conn.close()
    sys.exit(1)


if __name__ == "__main__":
    main()
