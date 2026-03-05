"""
Migration script for users table: add hashed_password column.
Run: python -m scripts.migrate_jwt
"""
import os
import sys
import sqlite3

# Ensure app is on path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)

def main():
    try:
        from app.core.config import settings
        db_url = settings.database_url
    except ImportError:
        # Fallback if app structure not found
        db_url = os.environ.get("DATABASE_URL", "sqlite:///./content_platform.db")

    if not db_url.startswith("sqlite"):
        print(f"Skipping migration: DATABASE_URL {db_url} is not SQLite.")
        return

    # Extract target path
    path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if not os.path.isabs(path):
        path = os.path.join(project_root, path)

    if not os.path.isfile(path):
        print(f"Database file not found at: {path}")
        return

    print(f"Migrating database: {path}")
    conn = sqlite3.connect(path)
    cur = conn.cursor()

    # Check users table
    cur.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cur.fetchall()}

    if "hashed_password" not in columns:
        print("Adding hashed_password column to users table...")
        # Add column with null default (or empty string)
        cur.execute("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)")
        
        # Optional: Set a temporary password for existing users if any?
        # Better to let them keep null and handle it in the app (logout/reset needed)
        
        print("Successfully added hashed_password column.")
    else:
        print("Column hashed_password already exists in users table.")

    conn.commit()
    conn.close()
    print("Migration completed.")

if __name__ == "__main__":
    main()
