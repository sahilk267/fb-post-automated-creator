import os
import json
import stripe
from typing import Optional, Any
from sqlalchemy.orm import Session
from cryptography.fernet import Fernet
import base64
from app.models.system_setting import SystemSetting
from app.core.config import settings

class SettingsService:
    def __init__(self, db: Session):
        self.db = db
        # Use token_encryption_key if available, fallback to a derived key from secret_key
        key = settings.token_encryption_key
        if not key:
            # Fallback for dev: derive a 32-byte key from the secret_key
            import hashlib
            key = base64.urlsafe_b64encode(hashlib.sha256(settings.secret_key.encode()).digest())
        else:
            if isinstance(key, str):
                key = key.encode()
        
        self.fernet = Fernet(key)

    def get_setting(self, key: str, decrypt: bool = False) -> Optional[str]:
        """Get setting from DB, fallback to environment."""
        db_setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if db_setting:
            val = db_setting.value
            if decrypt and db_setting.is_encrypted and val:
                try:
                    return self.fernet.decrypt(val.encode()).decode()
                except Exception:
                    return val # Fallback to raw if decryption fails
            return val
        
        # Fallback to env
        return getattr(settings, key.lower(), None)

    def update_setting(self, key: str, value: str, encrypt: bool = False, description: str = None):
        """Update or create a system setting."""
        db_setting = self.db.query(SystemSetting).filter(SystemSetting.key == key).first()
        
        val_to_store = value
        if encrypt:
            val_to_store = self.fernet.encrypt(value.encode()).decode()

        if db_setting:
            db_setting.value = val_to_store
            db_setting.is_encrypted = encrypt
            if description:
                db_setting.description = description
        else:
            db_setting = SystemSetting(
                key=key,
                value=val_to_store,
                is_encrypted=encrypt,
                description=description
            )
            self.db.add(db_setting)
        
        self.db.commit()
        return db_setting

    def test_stripe_connectivity(self) -> dict:
        """Test Stripe connectivity by listing products."""
        api_key = self.get_setting("STRIPE_API_KEY", decrypt=True)
        if not api_key:
            return {"success": False, "error": "No Stripe API key configured"}
        
        try:
            stripe.api_key = api_key
            stripe.Product.list(limit=1)
            return {"success": True, "message": "Successfully connected to Stripe"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def test_google_drive_connectivity(self) -> dict:
        """Test Google Drive connectivity by listing one file."""
        creds_json = self.get_setting("GOOGLE_DRIVE_CREDENTIALS_JSON", decrypt=True)
        folder_id = self.get_setting("GOOGLE_DRIVE_FOLDER_ID")
        
        if not creds_json:
            return {"success": False, "error": "No Google Drive credentials configured"}
        
        try:
            from google.oauth2 import service_account
            from googleapiclient.discovery import build
            
            # Credentials can be a JSON string or a path
            if os.path.exists(creds_json):
                creds = service_account.Credentials.from_service_account_file(
                    creds_json, scopes=['https://www.googleapis.com/auth/drive.file']
                )
            else:
                info = json.loads(creds_json)
                creds = service_account.Credentials.from_service_account_info(
                    info, scopes=['https://www.googleapis.com/auth/drive.file']
                )
            
            service = build('drive', 'v3', credentials=creds)
            query = f"'{folder_id}' in parents" if folder_id else None
            service.files().list(pageSize=1, q=query).execute()
            
            return {"success": True, "message": "Successfully connected to Google Drive"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def is_maintenance_mode(self) -> bool:
        """Check if site is in maintenance mode."""
        return self.get_setting("MAINTENANCE_MODE") == "true"

    def get_quota_limits(self, tier: str) -> dict:
        """Get quota limits for a specific tier from DB or defaults."""
        prefix = f"LIMIT_{tier.upper()}_"
        
        # Default map
        defaults = {
            "FREE": {"max_posts": 10, "max_members": 1},
            "PRO": {"max_posts": 100, "max_members": 5},
            "AGENCY": {"max_posts": 500, "max_members": 20}
        }
        
        d = defaults.get(tier.upper(), defaults["FREE"])
        
        return {
            "max_posts_per_month": int(self.get_setting(f"{prefix}MAX_POSTS") or d["max_posts"]),
            "max_members": int(self.get_setting(f"{prefix}MAX_MEMBERS") or d["max_members"]),
        }

    def sync_to_env(self):
        """Sync DB settings to .env file for permanent persistence."""
        env_path = os.path.join(os.getcwd(), ".env")
        db_settings = self.db.query(SystemSetting).all()
        
        # Read current .env
        env_content = {}
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    if "=" in line:
                        k, v = line.strip().split("=", 1)
                        env_content[k] = v
        
        # Update with DB (only non-encrypted for safety, or prompt)
        for s in db_settings:
            val = s.value
            if s.is_encrypted:
                try:
                    val = self.fernet.decrypt(val.encode()).decode()
                except:
                    continue # Skip if can't decrypt
            env_content[s.key] = val
            
        # Write back
        with open(env_path, "w") as f:
            for k, v in env_content.items():
                f.write(f"{k}={v}\n")
