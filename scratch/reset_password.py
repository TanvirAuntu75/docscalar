# scratch/reset_password.py
import sys
import sqlite3
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.auth import hash_password

def main():
    email = "tanvirzia2006@gmail.com"
    new_password = "tanvir123"
    
    print(f"Hashing new password '{new_password}'...")
    new_hash = hash_password(new_password)
    
    print(f"Connecting to database to update user '{email}'...")
    conn = sqlite3.connect("docforge.db")
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE email = ?", (new_hash, email))
        conn.commit()
        if cursor.rowcount > 0:
            print(f"Successfully reset password for '{email}' to '{new_password}'!")
        else:
            print(f"User '{email}' not found or update failed.")
    except Exception as e:
        print("Database error:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
