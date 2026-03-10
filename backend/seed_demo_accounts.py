import psycopg2
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

demo_users = [
    {
        "name": "Hon. Demo User",
        "email": "demo@nyaya.ai",
        "password": "demo123",
        "role": "judiciary"
    },
    {
        "name": "Officer Demo",
        "email": "officer@nyaya.ai",
        "password": "demo123",
        "role": "officer"
    },
    {
        "name": "Counsel Demo",
        "email": "analyst@nyaya.ai",
        "password": "demo123",
        "role": "analyst"
    }
]

def seed_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Ensure table exists
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user'
        )
    ''')
    
    for user in demo_users:
        cur.execute("SELECT id FROM users WHERE email = %s", (user['email'],))
        if not cur.fetchone():
            hashed_pw = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            cur.execute(
                "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
                (user['name'], user['email'], hashed_pw, user['role'])
            )
            print(f"Created demo user: {user['email']}")
        else:
            print(f"Demo user already exists: {user['email']}")
            
    conn.commit()
    cur.close()
    conn.close()
    print("Database seeding complete!")

if __name__ == "__main__":
    seed_db()
