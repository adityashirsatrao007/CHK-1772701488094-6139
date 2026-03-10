import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import bcrypt

router = APIRouter()

DATABASE_URL = 'postgresql://neondb_owner:npg_NmJBE2dy6CDn@ep-soft-leaf-a1iff04v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

def get_db_connection():
    # Intentionally ignoring channel_binding to avoid driver issues if not supported
    conn = psycopg2.connect(DATABASE_URL)
    return conn

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100),
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user'
        );
        CREATE TABLE IF NOT EXISTS cases (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) REFERENCES users(email),
            case_id VARCHAR(50) UNIQUE NOT NULL,
            case_data JSONB NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ''')
    conn.commit()
    cur.close()
    conn.close()

try:
    init_db()
except Exception as e:
    print("Error initializing database:", e)

class UserSignup(BaseModel):
    name: str
    email: str
    password: str

class UserSignin(BaseModel):
    email: str
    password: str

@router.post("/register")
def register(user: UserSignup):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cur.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s) RETURNING id, name, email, role",
            (user.name, user.email, hashed_pw, 'user')
        )
        new_user = cur.fetchone()
        conn.commit()
        return {"success": True, "user": new_user}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

@router.post("/login")
def login(user: UserSignin):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id, name, email, password_hash, role FROM users WHERE email = %s", (user.email,))
        db_user = cur.fetchone()
        if not db_user:
            raise HTTPException(status_code=400, detail="Invalid email or password")

        if not bcrypt.checkpw(user.password.encode('utf-8'), db_user['password_hash'].encode('utf-8')):
            raise HTTPException(status_code=400, detail="Invalid email or password")

        user_data = {
            "id": db_user['id'],
            "name": db_user['name'],
            "email": db_user['email'],
            "role": db_user['role']
        }
        return {"success": True, "user": user_data}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
