"""
Delete specific old uploads from the database:
- All November 2025 files (1st to 12th)
- The duplicate 12-11-2025_20251210_170326.xlsx
- The 09-02-2025.xlsx file
"""
import os
import sys
from sqlalchemy.orm import Session

# Load .env
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print("[OK] Loaded DATABASE_URL from .env file")
except ImportError:
    pass

from api.database import SessionLocal, Upload

def delete_old_data():
    # Exact filenames to delete
    files_to_delete = [
        "1-11-2025.xlsx",
        "4-11-2025.xlsx",
        "5-11-2025.xlsx",
        "6-11-2025.xlsx",
        "7-11-2025.xlsx",
        "8-11-2025.xlsx",
        "9-11-2025.xlsx",
        "10-11-2025.xlsx",
        "11-11-2025.xlsx",
        "12-11-2025.xlsx",
        "12-11-2025_20251210_170326.xlsx",
        "09-02-2025.xlsx",
    ]

    db: Session = SessionLocal()
    
    try:
        print("\n[DELETE] Files to delete:")
        print("=" * 60)
        
        found = []
        for filename in files_to_delete:
            upload = db.query(Upload).filter(Upload.filename == filename).first()
            if upload:
                rows = len(upload.raw_data) if hasattr(upload, 'raw_data') else 0
                print("  [FOUND]  %-45s ID: %3d  (%d rows)" % (filename, upload.id, rows))
                found.append(upload)
            else:
                print("  [MISS]   %-45s NOT FOUND" % filename)
        
        print("\n[INFO] Found %d of %d files" % (len(found), len(files_to_delete)))
        
        if not found:
            print("[ERROR] Nothing to delete.")
            return
        
        confirm = input("\n[WARNING] Type 'yes' to confirm deletion: ")
        if confirm.lower() not in ['yes', 'y']:
            print("[CANCELLED] Deletion cancelled.")
            return
        
        for upload in found:
            print("  Deleting %s..." % upload.filename)
            db.delete(upload)
        
        db.commit()
        print("\n[SUCCESS] Deleted %d uploads and all related data!" % len(found))
        
    except Exception as e:
        db.rollback()
        print("[ERROR] %s" % str(e))
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    delete_old_data()
