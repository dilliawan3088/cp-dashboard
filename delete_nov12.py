"""Delete the 2 remaining Nov 12 files from database."""
import os, sys
from sqlalchemy.orm import Session

try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print("[OK] Loaded .env")
except ImportError:
    pass

from api.database import SessionLocal, Upload

def delete():
    files = ["12-11-2025.xlsx", "12-11-2025_20251210_170326.xlsx"]
    db = SessionLocal()
    try:
        for f in files:
            upload = db.query(Upload).filter(Upload.filename == f).first()
            if upload:
                print("[DELETING] %s (ID: %d)" % (f, upload.id))
                db.delete(upload)
            else:
                print("[NOT FOUND] %s" % f)
        db.commit()
        print("[DONE] Deleted successfully!")
    except Exception as e:
        db.rollback()
        print("[ERROR] %s" % str(e))
    finally:
        db.close()

if __name__ == "__main__":
    delete()
