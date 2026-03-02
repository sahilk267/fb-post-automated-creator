"""Generate a new TOKEN_ENCRYPTION_KEY for .env. Run once and paste the value into .env."""
from cryptography.fernet import Fernet

if __name__ == "__main__":
    key = Fernet.generate_key().decode()
    print("Add this to your .env file:")
    print(f"TOKEN_ENCRYPTION_KEY={key}")
