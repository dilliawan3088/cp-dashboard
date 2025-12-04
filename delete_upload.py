"""
Script to delete a specific upload and all its related data from the database.
Loads DATABASE_URL from .env file if available.

Usage: 
    python delete_upload.py "12-11-2025.xlsx"  # Delete single file
    python delete_upload.py --dates 10,11,12   # Delete dates 10, 11, 12 (November 2025)
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
except ImportError:
    pass  # python-dotenv not installed, use system environment variables

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

def extract_date_from_filename(filename: str):
    """Extract date from filename in format: day-month-year.xlsx"""
    if not filename:
        return None
    try:
        name_without_ext = filename.replace('.xlsx', '').replace('.xls', '')
        parts = name_without_ext.split('-')
        if len(parts) == 3:
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            if 1 <= month <= 12 and 1 <= day <= 31 and year > 2000:
                return datetime(year, month, day)
    except (ValueError, IndexError):
        return None
    return None

def delete_uploads_by_dates(day_numbers: list, month: int = 11, year: int = 2025, skip_confirm: bool = False):
    """
    Delete uploads for specific dates.
    Args:
        day_numbers: List of day numbers (e.g., [10, 11, 12])
        month: Month number (default: 11 for November)
        year: Year (default: 2025)
        skip_confirm: If True, skip confirmation prompt
    """
    db: Session = SessionLocal()
    
    try:
        deleted_count = 0
        not_found = []
        
        dates_list = [f"{d:02d}-{month:02d}-{year}" for d in day_numbers]
        print(f"\n🗑️  Deleting uploads for dates: {', '.join(dates_list)}")
        
        if not skip_confirm:
            confirm = input("⚠️  Are you sure? This will delete all data for these dates. (yes/no): ")
            if confirm.lower() not in ['yes', 'y']:
                print("❌ Deletion cancelled.")
                return False
        
        for day in day_numbers:
            # Construct expected filename
            filename = f"{day:02d}-{month:02d}-{year}.xlsx"
            
            # Find upload by filename
            upload = db.query(Upload).filter(Upload.filename == filename).first()
            
            if not upload:
                print(f"⚠️  Upload not found: {filename}")
                not_found.append(filename)
                continue
            
            # Get upload info
            upload_id = upload.id
            raw_data_count = len(upload.raw_data) if hasattr(upload, 'raw_data') else 0
            
            print(f"\n📋 Found upload: {filename}")
            print(f"   ID: {upload_id}")
            print(f"   Raw Data rows: {raw_data_count}")
            
            # Delete the upload (cascade will handle related data)
            db.delete(upload)
            deleted_count += 1
            print(f"   ✅ Deleted successfully!")
        
        if deleted_count > 0:
            db.commit()
            print(f"\n✅ Successfully deleted {deleted_count} upload(s)!")
        
        if not_found:
            print(f"\n⚠️  {len(not_found)} upload(s) not found: {', '.join(not_found)}")
        
        return deleted_count > 0
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting uploads: {str(e)}")
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
    
    # Check if dates provided as argument
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        
        # Check for --dates flag
        if arg == "--dates" and len(sys.argv) > 2:
            dates_str = sys.argv[2]
            skip_confirm = "--yes" in sys.argv or "-y" in sys.argv
            try:
                # Parse comma-separated dates (e.g., "10,11,12")
                day_numbers = [int(d.strip()) for d in dates_str.split(',')]
                delete_uploads_by_dates(day_numbers, skip_confirm=skip_confirm)
            except ValueError:
                print("❌ Invalid date format. Use: --dates 10,11,12")
        else:
            # Single filename
            filename = arg
            delete_upload_by_filename(filename)
    else:
        # Interactive mode
        print("\nOptions:")
        print("1. List all uploads")
        print("2. Delete an upload by filename")
        print("3. Delete uploads by dates (e.g., 10, 11, 12)")
        print("4. Exit")
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            list_all_uploads()
        elif choice == "2":
            filename = input("\nEnter filename to delete (e.g., '12-11-2025.xlsx'): ").strip()
            if filename:
                delete_upload_by_filename(filename)
            else:
                print("❌ No filename provided.")
        elif choice == "3":
            dates_str = input("\nEnter day numbers separated by commas (e.g., '10,11,12' for Nov 10, 11, 12, 2025): ").strip()
            try:
                day_numbers = [int(d.strip()) for d in dates_str.split(',')]
                print(f"\n🗑️  Will delete uploads for dates: {', '.join([f'{d:02d}-11-2025' for d in day_numbers])}")
                confirm = input("⚠️  Are you sure? This will delete all data for these dates. (yes/no): ")
                if confirm.lower() in ['yes', 'y']:
                    delete_uploads_by_dates(day_numbers)
                else:
                    print("❌ Deletion cancelled.")
            except ValueError:
                print("❌ Invalid date format. Use comma-separated numbers like: 10,11,12")
        elif choice == "4":
            print("👋 Goodbye!")
        else:
            print("❌ Invalid choice.")


