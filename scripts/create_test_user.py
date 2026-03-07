from app.core.database import SessionLocal, Base, engine as app_engine
from app.models.user import User
from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Override to use local data folder
local_db_path = "sqlite:///./data/content_platform.db"
engine = create_engine(local_db_path, connect_args={"check_same_thread": False})
SessionLocalOverride = sessionmaker(autocommit=False, autoflush=False, bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocalOverride()
    try:
        email = "admin@example.com"
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"User {email} already exists.")
            return
        
        user = User(
            email=email,
            username="admin",
            full_name="Admin User",
            hashed_password=pwd_context.hash("admin123"),
            is_active=True,
            is_admin=True
        )
        db.add(user)
        db.commit()
        print(f"User {email} created with password 'admin123' in {local_db_path}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
