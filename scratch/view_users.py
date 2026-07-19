# scratch/view_users.py
import sqlite3

def main():
    conn = sqlite3.connect("docforge.db")
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, email, tier, created_at FROM users")
        rows = cursor.fetchall()
        print("Users in database:")
        for r in rows:
            print(f"ID: {r[0]}, Email: {r[1]}, Tier: {r[2]}, Created: {r[3]}")
    except Exception as e:
        print("Error reading users table:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    main()
