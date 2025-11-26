"""
Script to delete a specific upload and all its related data from the database.
Usage: python delete_upload.py "12-11-2025.xlsx"
"""

import os
import sys
from sqlalchemy.orm import Session
from api.database import SessionLocal, Upload, init_db

def delete_upload_by_filename(filename: str):
    """
    Delete an upload by filename and all its related data.
    Due to cascade relationships, deleting the upload will automatically
    delete all related records (raw_data, calculations, summaries, etc.)
    """
    db: Session = SessionLocal()
    
    try:
        # Find the upload by filename
        upload = db.query(Upload).filter(Upload.filename == filename).first()
        
        if not upload:
            print(f"❌ Upload not found: {filename}")
            print("\nAvailable uploads:")
            all_uploads = db.query(Upload).order_by(Upload.upload_date.desc()).all()
            for u in all_uploads:
                print(f"  - {u.filename} (ID: {u.id}, Date: {u.upload_date})")
            return False
        
        # Get upload info before deletion
        upload_id = upload.id
        upload_date = upload.upload_date
        processed = upload.processed
        
        print(f"📋 Found upload:")
        print(f"   ID: {upload_id}")
        print(f"   Filename: {upload.filename}")
        print(f"   Upload Date: {upload_date}")
        print(f"   Processed: {'Yes' if processed == 1 else 'No'}")
        
        # Count related records (optional, for info)
        raw_data_count = len(upload.raw_data) if hasattr(upload, 'raw_data') else 0
        calculations_count = len(upload.calculations) if hasattr(upload, 'calculations') else 0
        
        print(f"\n📊 Related data to be deleted:")
        print(f"   Raw Data rows: {raw_data_count}")
        print(f"   Calculations: {calculations_count}")
        print(f"   (All related data will be deleted due to cascade relationships)")
        
        # Confirm deletion
        confirm = input(f"\n⚠️  Are you sure you want to delete '{filename}' and all its data? (yes/no): ")
        
        if confirm.lower() not in ['yes', 'y']:
            print("❌ Deletion cancelled.")
            return False
        
        # Delete the upload (cascade will handle related data)
        db.delete(upload)
        db.commit()
        
        print(f"\n✅ Successfully deleted upload '{filename}' (ID: {upload_id}) and all related data!")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting upload: {str(e)}")
        return False
    finally:
        db.close()

def list_all_uploads():
    """List all uploads in the database"""
    db: Session = SessionLocal()
    
    try:
        uploads = db.query(Upload).order_by(Upload.upload_date.desc()).all()
        
        if not uploads:
            print("No uploads found in database.")
            return
        
        print("\n📋 All uploads in database:")
        print("-" * 80)
        for upload in uploads:
            status = "✅ Processed" if upload.processed == 1 else "⏳ Not Processed"
            print(f"ID: {upload.id:3d} | {status} | {upload.filename:30s} | {upload.upload_date}")
        print("-" * 80)
        
    except Exception as e:
        print(f"❌ Error listing uploads: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🗑️  Upload Deletion Script")
    print("=" * 80)
    
    # Check if filename provided as argument
    if len(sys.argv) > 1:
        filename = sys.argv[1]
        delete_upload_by_filename(filename)
    else:
        # Interactive mode
        print("\nOptions:")
        print("1. List all uploads")
        print("2. Delete an upload by filename")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            list_all_uploads()
        elif choice == "2":
            filename = input("\nEnter filename to delete (e.g., '12-11-2025.xlsx'): ").strip()
            if filename:
                delete_upload_by_filename(filename)
            else:
                print("❌ No filename provided.")
        elif choice == "3":
            print("👋 Goodbye!")
        else:
            print("❌ Invalid choice.")

