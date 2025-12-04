"""
Quick script to delete uploads for dates 10, 11, 12 (November 2025)
Loads DATABASE_URL from .env file if available
"""
import os
import sys
from datetime import datetime
from sqlalchemy.orm import Session

# Load environment variables from .env file if it exists
try:
    from dotenv import load_dotenv
    # Load .env file from the project root
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print("✅ Loaded DATABASE_URL from .env file")
    else:
        print("⚠️  .env file not found, checking system environment variables...")
except ImportError:
    print("⚠️  python-dotenv not installed. Install it with: pip install python-dotenv")
    print("   Trying to use system environment variables...")

# Check DATABASE_URL
if not os.getenv("DATABASE_URL"):
    print("❌ ERROR: DATABASE_URL environment variable is not set!")
    print("Please either:")
    print("  1. Create a .env file with: DATABASE_URL=your_connection_string")
    print("  2. Or set it in your system: set DATABASE_URL=your_connection_string")
    sys.exit(1)

from api.database import SessionLocal, Upload

def delete_dates_10_11_12():
    """Delete uploads for dates 10-11-2025, 11-11-2025, 12-11-2025"""
    print("🗑️  Upload Deletion Script")
    print("=" * 80)
    
    try:
        db: Session = SessionLocal()
    except Exception as e:
        print(f"❌ Error connecting to database: {str(e)}")
        return False
    
    try:
        dates_to_delete = [
            "10-11-2025.xlsx",
            "11-11-2025.xlsx", 
            "12-11-2025.xlsx"
        ]
        
        deleted_count = 0
        not_found = []
        
        print("🗑️  Deleting uploads for dates: 10-11-2025, 11-11-2025, 12-11-2025\n")
        
        for filename in dates_to_delete:
            upload = db.query(Upload).filter(Upload.filename == filename).first()
            
            if not upload:
                print(f"⚠️  Upload not found: {filename}")
                not_found.append(filename)
                continue
            
            upload_id = upload.id
            raw_data_count = len(upload.raw_data) if hasattr(upload, 'raw_data') else 0
            
            print(f"📋 Found upload: {filename}")
            print(f"   ID: {upload_id}")
            print(f"   Raw Data rows: {raw_data_count}")
            
            db.delete(upload)
            deleted_count += 1
            print(f"   ✅ Deleted successfully!\n")
        
        if deleted_count > 0:
            db.commit()
            print(f"✅ Successfully deleted {deleted_count} upload(s)!")
        
        if not_found:
            print(f"\n⚠️  {len(not_found)} upload(s) not found: {', '.join(not_found)}")
        
        return deleted_count > 0
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting uploads: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    try:
        delete_dates_10_11_12()
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

