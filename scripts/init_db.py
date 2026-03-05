import sqlite3
import os
import app.models  # noqa: F401 - register all model tables before init_db()
from app.core.database import init_db, SessionLocal, engine
from app.models.user import User
from app.models.content import Content, ContentStatus
from app.models.content_category import ContentCategory
from app.models.hook_template import HookTemplate


def migrate_schema():
    """Ensure database schema matches latest models (specifically for users.hashed_password)."""
    db_url = str(engine.url)
    if not db_url.startswith("sqlite"):
        return
    
    path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
    if not os.path.exists(path):
        return

    print(f"Checking schema for: {path}")
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    
    # Check users table
    cur.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cur.fetchall()}
    
    if columns and "hashed_password" not in columns:
        print("Migrating: Adding hashed_password to users table...")
        cur.execute("ALTER TABLE users ADD COLUMN hashed_password VARCHAR(255)")
        conn.commit()
        print("Migration successful.")
    
    # Check content table
    cur.execute("PRAGMA table_info(content)")
    content_columns = {row[1] for row in cur.fetchall()}
    if content_columns and "media_id" not in content_columns:
        print("Migrating: Adding media_id to content table...")
        cur.execute("ALTER TABLE content ADD COLUMN media_id INTEGER REFERENCES media(id)")
        conn.commit()
        print("Migration successful.")
    
    conn.close()



def create_sample_data():
    """Create sample users and content. Idempotent: skips if users already exist."""
    db = SessionLocal()
    
    try:
        if db.query(User).first() is not None:
            print("Users already exist, skipping sample data.")
            return
        from app.core import security
        # Create admin user
        admin = User(
            username="admin",
            email="admin@example.com",
            full_name="Admin User",
            hashed_password=security.get_password_hash("admin123"),
            is_active=True,
            is_admin=True
        )
        db.add(admin)
        
        # Create regular user
        user = User(
            username="user1",
            email="user1@example.com",
            full_name="Regular User",
            hashed_password=security.get_password_hash("password123"),
            is_active=True,
            is_admin=False
        )
        db.add(user)
        
        db.commit()
        db.refresh(admin)
        db.refresh(user)
        
        # Create sample content
        content1 = Content(
            title="Sample Draft Content",
            body="This is a sample draft content.",
            status=ContentStatus.DRAFT,
            created_by_id=user.id
        )
        
        content2 = Content(
            title="Sample Pending Content",
            body="This content is pending approval.",
            status=ContentStatus.PENDING_APPROVAL,
            created_by_id=user.id
        )
        
        db.add(content1)
        db.add(content2)
        db.commit()

        # VCE seed: categories and hook templates (if none exist)
        if db.query(ContentCategory).first() is None:
            cat_motivation = ContentCategory(name="Motivation", slug="motivation", sort_order=1)
            cat_tips = ContentCategory(name="Tips", slug="tips", sort_order=2)
            cat_reflection = ContentCategory(name="Reflection", slug="reflection", sort_order=3)
            db.add(cat_motivation)
            db.add(cat_tips)
            db.add(cat_reflection)
            db.commit()
            db.refresh(cat_motivation)
            db.refresh(cat_tips)
            db.refresh(cat_reflection)
            t1 = HookTemplate(
                name="Hook + Body + CTA",
                body_template="{hook}\n\n{body}\n\n{cta}",
                default_hook="Here's something to think about.",
                default_cta="What would you add?",
                category_id=cat_motivation.id,
                sort_order=1,
            )
            t2 = HookTemplate(
                name="Question hook",
                body_template="{hook}\n\n{body}\n\n{cta}",
                default_hook="Did you know?",
                default_cta="Share if this helped.",
                category_id=cat_tips.id,
                sort_order=2,
            )
            db.add(t1)
            db.add(t2)
            db.commit()
            print("VCE categories and templates seeded.")
        
        print("Sample data created successfully!")
        print(f"Admin user ID: {admin.id}")
        print(f"Regular user ID: {user.id}")
        
    except Exception as e:
        db.rollback()
        print(f"Error creating sample data: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("Migrating database schema...")
    migrate_schema()
    print("Initializing database tables...")
    init_db()
    print("Creating sample data...")
    create_sample_data()

