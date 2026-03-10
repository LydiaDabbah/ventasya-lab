# backend/test_db.py
from sqlalchemy import text
from app.db.database import engine

try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Conexión exitosa:", result.scalar())
except Exception as e:
    print("❌ Error de conexión:", e)
