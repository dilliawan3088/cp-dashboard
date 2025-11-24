"""
FastAPI application with endpoints for poultry processing dashboard.
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict
import os
import shutil
from datetime import datetime, timedelta


from api.database import (
    init_db, get_db, Upload, RawData, Calculation, Summary, 
    TruckPerformance, FarmPerformance, ProcessingHistory, OverallSummary, HistoricalTrend, DATABASE_URL
)
import json
from api.models import (
    UploadResponse, ProcessResponse, DataResponse, HistoryResponse,
    SummaryResponse, RawDataModel, CalculationModel, SummaryModel, HistoryItem,
    TruckPerformanceModel, FarmPerformanceModel, OverallSummaryModel, HistoricalTrendModel, HistoricalTrendsResponse
)
from api.excel_processor import process_excel_file
from api.data_analyzer import analyze_data

# Initialize FastAPI app
app = FastAPI(title="Poultry Processing Dashboard API")

# CORS middleware - allow both localhost and 127.0.0.1
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for frontend
# Mount static files for frontend
# Use absolute path to ensure it works on Vercel
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
frontend_dir = os.path.join(base_dir, "frontend")

try:
    if os.path.exists(frontend_dir):
        print(f"Mounting static files from: {frontend_dir}")
        app.mount("/static", StaticFiles(directory=frontend_dir), name="static")
    elif os.path.exists("frontend"):
        print("Mounting static files from: frontend (relative)")
        app.mount("/static", StaticFiles(directory="frontend"), name="static")
    else:
        print(f"Warning: Frontend directory not found at {frontend_dir} or ./frontend. Static files will not be served.")
except Exception as e:
    print(f"Error mounting static files: {e}")

@app.get("/debug-paths")
async def debug_paths():
    """Debug endpoint to check file system on Vercel"""
    import os
    cwd = os.getcwd()
    files = os.listdir(cwd)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    base_files = os.listdir(base_dir) if os.path.exists(base_dir) else "Dir not found"
    
    return {
        "cwd": cwd,
        "files_in_cwd": files,
        "base_dir": base_dir,
        "files_in_base": base_files,
        "frontend_exists": os.path.exists(os.path.join(base_dir, "frontend")),
        "db_exists": os.path.exists(os.path.join(base_dir, "poultry_dashboard.db")),
        "tmp_files": os.listdir("/tmp") if os.path.exists("/tmp") else "No /tmp"
    }

# ... (rest of the file) ...

@app.get("/")
async def root():
    """Root endpoint - redirect to dashboard"""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # Recursive file listing to find where 'frontend' went
    file_map = []
    for root, dirs, files in os.walk(os.getcwd()):
        for file in files:
            file_map.append(os.path.join(root, file))
            
    return {
        "error": "Dashboard file not found", 
        "path": index_path, 
        "cwd": os.getcwd(),
        "base_dir": base_dir,
        "frontend_dir": frontend_dir,
        "exists": os.path.exists(frontend_dir),
        "all_files": file_map[:100] # Limit to first 100 to avoid huge response
    }

# Create uploads directory
# On Vercel, we must use /tmp
IS_VERCEL = os.environ.get("VERCEL") == "1"
if IS_VERCEL:
    UPLOAD_DIR = "/tmp/uploads"
else:
    UPLOAD_DIR = "uploads"

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    # On Vercel, copy the pre-populated database to /tmp if it doesn't exist there
    if IS_VERCEL:
        import shutil
        # Get absolute path to the source DB (assumed to be in project root)
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        source_db = os.path.join(base_dir, "poultry_dashboard.db")
        target_db = "/tmp/poultry_dashboard.db"
        
        print(f"Looking for source DB at: {source_db}")
        
        if os.path.exists(source_db):
            if not os.path.exists(target_db):
                print(f"Copying pre-populated database from {source_db} to {target_db}...")
                try:
                    shutil.copy2(source_db, target_db)
                    print("Database copied successfully!")
                except Exception as e:
                    print(f"Error copying database: {e}")
        else:
            print(f"Warning: Source database {source_db} not found! Current dir: {os.getcwd()}")
            # List files to help debug
            print(f"Files in {base_dir}: {os.listdir(base_dir)}")

    init_db()
    print("Database initialized!")
    
    # Automatically process all Excel files in uploads folder
    # On Vercel, we skip auto-processing if we already have data to avoid timeouts
    if not IS_VERCEL:
        await auto_process_files()


def extract_date_from_filename(filename: str) -> Optional[datetime]:
    """
    Extract date from filename in format: day-month-year.xlsx
    Returns datetime object or None if parsing fails
    """
    if not filename:
        return None
    try:
        # Remove .xlsx extension
        name_without_ext = filename.replace('.xlsx', '').replace('.xls', '')
        # Try to parse day-month-year format
        parts = name_without_ext.split('-')
        if len(parts) == 3:
            day = int(parts[0])
            month = int(parts[1])
            year = int(parts[2])
            if 1 <= month <= 12 and 1 <= day <= 31 and year > 2000:
                return datetime(year, month, day)
    except (ValueError, IndexError) as e:
        print(f"Error extracting date from filename '{filename}': {e}")
    return None

def get_uploads_in_date_range(db: Session, days: Optional[int] = None, upload_id: Optional[int] = None, 
                               start_date: Optional[str] = None, end_date: Optional[str] = None):
    """
    Get uploads within a date range or a specific upload.
    If upload_id is provided, return only that upload.
    If start_date and end_date are provided, return uploads where filename date is in that range.
    If days is provided, return uploads from last N days (based on filename date).
    If neither is provided, return all uploads.
    """
    query = db.query(Upload).filter(Upload.processed == 1)
    
    if upload_id:
        # Return only specific upload
        query = query.filter(Upload.id == upload_id)
    elif start_date and end_date:
        # Return uploads where filename date is in date range
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            end = datetime.strptime(end_date, '%Y-%m-%d')
            # Include the entire end date
            end = end.replace(hour=23, minute=59, second=59)
            
            # Get all processed uploads and filter by filename date
            all_uploads = query.all()
            filtered_uploads = []
            for upload in all_uploads:
                file_date = extract_date_from_filename(upload.filename)
                if file_date and start <= file_date <= end:
                    filtered_uploads.append(upload)
            
            return filtered_uploads
        except ValueError as e:
            print(f"Error parsing dates: {e}")
            return []
    elif days:
        # Return uploads from last N days (based on filename date)
        # First, get all processed uploads and extract their dates
        all_uploads = query.all()
        print(f"DEBUG: Found {len(all_uploads)} processed uploads for days={days} filter")
        uploads_with_dates = []
        for upload in all_uploads:
            file_date = extract_date_from_filename(upload.filename)
            if file_date:
                uploads_with_dates.append((upload, file_date))
                print(f"DEBUG: Upload {upload.id} ({upload.filename}) -> date: {file_date.date()}")
            else:
                print(f"DEBUG: Upload {upload.id} ({upload.filename}) -> NO DATE EXTRACTED")
        
        if not uploads_with_dates:
            print(f"DEBUG: No uploads with valid dates found")
            return []
        
        # Find the most recent filename date (not system date)
        max_file_date = max(file_date for _, file_date in uploads_with_dates)
        # Normalize to start of day
        max_file_date = max_file_date.replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = max_file_date - timedelta(days=days - 1)  # days-1 to include the most recent day
        cutoff_date = cutoff_date.replace(hour=0, minute=0, second=0, microsecond=0)
        
        print(f"DEBUG: Most recent file date: {max_file_date.date()}, Cutoff date (last {days} days): {cutoff_date.date()}")
        
        # Filter uploads where filename date is within the last N days from the most recent file
        filtered_uploads = []
        for upload, file_date in uploads_with_dates:
            file_date_normalized = file_date.replace(hour=0, minute=0, second=0, microsecond=0)
            if file_date_normalized >= cutoff_date:
                filtered_uploads.append(upload)
                print(f"DEBUG: Including upload {upload.id} ({upload.filename}) - date: {file_date_normalized.date()}")
            else:
                print(f"DEBUG: Excluding upload {upload.id} ({upload.filename}) - date: {file_date_normalized.date()} < cutoff: {cutoff_date.date()}")
        
        print(f"DEBUG: Returning {len(filtered_uploads)} uploads for days={days} filter")
        
        # Sort by filename date descending
        filtered_uploads.sort(key=lambda u: extract_date_from_filename(u.filename) or datetime.min, reverse=True)
        return filtered_uploads
    
    return query.order_by(Upload.upload_date.desc()).all()


def aggregate_overall_summary(db: Session, upload_ids: List[int]) -> Dict:
    """Aggregate overall summary data from multiple uploads"""
    if not upload_ids:
        return {}
    
    overall_summaries = db.query(OverallSummary).filter(
        OverallSummary.upload_id.in_(upload_ids)
    ).all()
    
    if not overall_summaries:
        return {}
    
    # Sum all numeric fields
    aggregated = {
        'total_delivered': sum(s.total_delivered or 0 for s in overall_summaries),
        'total_birds_counted': sum(s.total_birds_counted or 0 for s in overall_summaries),
        'net_difference': sum(s.net_difference or 0 for s in overall_summaries),
        'total_doa': sum(s.total_doa or 0 for s in overall_summaries),
        'total_slaughter': sum(s.total_slaughter or 0 for s in overall_summaries),
        'total_non_halal': sum(s.total_non_halal or 0 for s in overall_summaries)
    }
    
    # Recalculate percentages from aggregated totals
    if aggregated['total_birds_counted'] > 0:
        aggregated['doa_percentage'] = round((aggregated['total_doa'] / aggregated['total_birds_counted']) * 100, 2)
        aggregated['slaughter_yield_percentage'] = round((aggregated['total_slaughter'] / aggregated['total_birds_counted']) * 100, 2)
    else:
        aggregated['doa_percentage'] = 0.0
        aggregated['slaughter_yield_percentage'] = 0.0
    
    return aggregated


def aggregate_truck_performance(db: Session, upload_ids: List[int]) -> List[Dict]:
    """Aggregate truck performance data from multiple uploads"""
    if not upload_ids:
        return []
    
    truck_perfs = db.query(TruckPerformance).filter(
        TruckPerformance.upload_id.in_(upload_ids)
    ).all()
    
    # Group by truck_no and aggregate
    truck_dict = {}
    for tp in truck_perfs:
        truck_no = tp.truck_no
        if truck_no not in truck_dict:
            truck_dict[truck_no] = {
                'truck_no': truck_no,
                'serial_numbers': set(),
                'total_birds_arrived': 0,
                'total_birds_slaughtered': 0,
                'total_doa': 0,
                'total_bird_counter': 0,
                'total_missing_birds': 0,
                'total_variance': 0,
                'row_count': 0
            }
        
        # Aggregate values
        truck_dict[truck_no]['total_birds_arrived'] += tp.total_birds_arrived or 0
        truck_dict[truck_no]['total_birds_slaughtered'] += tp.total_birds_slaughtered or 0
        truck_dict[truck_no]['total_doa'] += tp.total_doa or 0
        truck_dict[truck_no]['total_bird_counter'] += tp.total_bird_counter or 0
        truck_dict[truck_no]['total_missing_birds'] += tp.total_missing_birds or 0
        truck_dict[truck_no]['total_variance'] += tp.total_variance or 0
        truck_dict[truck_no]['row_count'] += tp.row_count or 0
        
        # Collect serial numbers
        if tp.serial_numbers:
            serial_nums = [int(x.strip()) for x in tp.serial_numbers.replace(', ', ',').split(',') if x.strip()]
            truck_dict[truck_no]['serial_numbers'].update(serial_nums)
    
    # Convert to list and recalculate percentages
    result = []
    for truck_no, data in truck_dict.items():
        total_arrived = data['total_birds_arrived']
        total_counted = data['total_bird_counter'] + data['total_doa']
        
        result.append({
            'truck_no': truck_no,
            'serial_numbers': sorted(list(data['serial_numbers'])),
            'total_birds_arrived': total_arrived,
            'total_birds_slaughtered': data['total_birds_slaughtered'],
            'total_doa': data['total_doa'],
            'total_bird_counter': data['total_bird_counter'],
            'total_missing_birds': data['total_missing_birds'],
            'total_variance': data['total_variance'],
            'row_count': data['row_count'],
            # Fix: Death percentage should be DOA / Total Arrived (D/O Quantity), not DOA / Total Counted
            'death_percentage': round((data['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0, 2),
            'missing_birds_percentage': round((data['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0, 2),
            'variance_percentage': round((data['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        })
    
    return result


def aggregate_farm_performance(db: Session, upload_ids: List[int]) -> List[Dict]:
    """Aggregate farm performance data from multiple uploads"""
    if not upload_ids:
        return []
    
    farm_perfs = db.query(FarmPerformance).filter(
        FarmPerformance.upload_id.in_(upload_ids)
    ).all()
    
    # Group by farm and aggregate
    farm_dict = {}
    for fp in farm_perfs:
        farm = fp.farm
        if farm not in farm_dict:
            farm_dict[farm] = {
                'farm': farm,
                'total_birds_arrived': 0,
                'total_birds_slaughtered': 0,
                'total_doa': 0,
                'total_missing_birds': 0,
                'total_variance': 0,
                'row_count': 0
            }
        
        # Aggregate values
        farm_dict[farm]['total_birds_arrived'] += fp.total_birds_arrived or 0
        farm_dict[farm]['total_birds_slaughtered'] += fp.total_birds_slaughtered or 0
        farm_dict[farm]['total_doa'] += fp.total_doa or 0
        farm_dict[farm]['total_missing_birds'] += fp.total_missing_birds or 0
        farm_dict[farm]['total_variance'] += fp.total_variance or 0
        farm_dict[farm]['row_count'] += fp.row_count or 0
    
    # Convert to list and recalculate percentages
    result = []
    for farm, data in farm_dict.items():
        total_arrived = data['total_birds_arrived']
        total_counted = data['total_birds_arrived']  # For farm, use arrived as base
        
        result.append({
            'farm': farm,
            'total_birds_arrived': total_arrived,
            'total_birds_slaughtered': data['total_birds_slaughtered'],
            'total_doa': data['total_doa'],
            'total_missing_birds': data['total_missing_birds'],
            'total_variance': data['total_variance'],
            'row_count': data['row_count'],
            'death_percentage': round((data['total_doa'] / total_counted * 100) if total_counted > 0 else 0, 2),
            'missing_birds_percentage': round((data['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0, 2),
            'variance_percentage': round((data['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        })
    
    return result


def aggregate_summary(db: Session, upload_ids: List[int]) -> Dict:
    """Aggregate summary data (Broiler/Breeder) from multiple uploads"""
    if not upload_ids:
        return {'summaries': [], 'grand_total': {}}
    
    summaries = db.query(Summary).filter(Summary.upload_id.in_(upload_ids)).all()
    
    # Group by category
    category_dict = {}
    for s in summaries:
        category = s.category
        if category not in category_dict:
            category_dict[category] = {
                'category': category,
                'total_birds_arrived': 0,
                'total_birds_slaughtered': 0,
                'total_doa': 0,
                'total_missing_birds': 0,
                'total_variance': 0
            }
        
        category_dict[category]['total_birds_arrived'] += s.total_birds_arrived or 0
        category_dict[category]['total_birds_slaughtered'] += s.total_birds_slaughtered or 0
        category_dict[category]['total_doa'] += s.total_doa or 0
        category_dict[category]['total_missing_birds'] += s.total_missing_birds or 0
        category_dict[category]['total_variance'] += s.total_variance or 0
    
    # Convert to list and recalculate percentages
    summaries_list = []
    grand_total = {
        'total_birds_arrived': 0,
        'total_birds_slaughtered': 0,
        'total_doa': 0,
        'total_bird_counter': 0,
        'total_missing_birds': 0,
        'total_variance': 0
    }
    
    for category, data in category_dict.items():
        total_arrived = data['total_birds_arrived']
        summaries_list.append({
            'category': category,
            'total_birds_arrived': total_arrived,
            'total_birds_slaughtered': data['total_birds_slaughtered'],
            'total_doa': data['total_doa'],
            'total_missing_birds': data['total_missing_birds'],
            'total_variance': data['total_variance'],
            'death_percentage': round((data['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0, 2),
            'missing_percentage': round((data['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0, 2),
            'variance_percentage': round((data['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
        })
        
        grand_total['total_birds_arrived'] += total_arrived
        grand_total['total_birds_slaughtered'] += data['total_birds_slaughtered']
        grand_total['total_doa'] += data['total_doa']
        grand_total['total_missing_birds'] += data['total_missing_birds']
        grand_total['total_variance'] += data['total_variance']
    
    # Get raw data for bird_counter
    raw_data_objs = db.query(RawData).filter(RawData.upload_id.in_(upload_ids)).all()
    grand_total['total_bird_counter'] = sum(r.bird_counter or 0 for r in raw_data_objs)
    
    # Calculate overall percentages
    total_arrived = grand_total['total_birds_arrived']
    grand_total['death_percentage'] = round((grand_total['total_doa'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
    grand_total['missing_percentage'] = round((grand_total['total_missing_birds'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
    grand_total['variance_percentage'] = round((grand_total['total_variance'] / total_arrived * 100) if total_arrived > 0 else 0, 2)
    
    return {'summaries': summaries_list, 'grand_total': grand_total}


async def auto_process_files():
    """
    Automatically process all Excel files in the uploads folder on startup.
    """
    db = next(get_db())
    try:
        if not os.path.exists(UPLOAD_DIR):
            print("Uploads directory does not exist. Skipping auto-processing.")
            return
        
        excel_files = [f for f in os.listdir(UPLOAD_DIR) if f.endswith(('.xlsx', '.xls'))]
        
        if not excel_files:
            print("No Excel files found in uploads folder.")
            return
        
        print(f"Found {len(excel_files)} Excel file(s) in uploads folder. Processing...")
        
        for filename in excel_files:
            try:
                # Check if file is already registered
                existing_upload = db.query(Upload).filter(Upload.filename == filename).first()
                
                if existing_upload and existing_upload.processed == 1:
                    print(f"File '{filename}' already processed. Skipping.")
                    continue
                
                # Register file if not exists
                if not existing_upload:
                    file_path = os.path.join(UPLOAD_DIR, filename)
                    upload = Upload(
                        filename=filename,
                        file_path=file_path,
                        processed=0,
                        total_rows=0
                    )
                    db.add(upload)
                    db.commit()
                    db.refresh(upload)
                    upload_id = upload.id
                    print(f"Registered file: {filename}")
                else:
                    upload_id = existing_upload.id
                
                # Process the file
                if not existing_upload or existing_upload.processed == 0:
                    print(f"Processing file: {filename}...")
                    await process_file_internal(upload_id, db)
                    print(f"Successfully processed: {filename}")
                
            except Exception as e:
                print(f"Error processing file '{filename}': {str(e)}")
                continue
        
        print("Auto-processing completed!")
        
    except Exception as e:
        print(f"Error during auto-processing: {str(e)}")
    finally:
        db.close()


async def process_file_internal(upload_id: int, db: Session):
    """
    Internal function to process a file (extracted from process_file endpoint).
    """
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise ValueError("Upload not found")
    
    # Extract data from Excel
    extracted_data = process_excel_file(upload.file_path)
    raw_data_list = extracted_data.get('raw_data', [])
    grand_total = extracted_data.get('grand_total')
    
    # Save extracted data to JSON
    json_path = os.path.join(UPLOAD_DIR, f"extracted_data_{upload.id}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(extracted_data, f, indent=2, ensure_ascii=False, default=str)
    
    if not raw_data_list:
        raise ValueError("No data found in Excel file")
    
    # Analyze data
    analysis_result = analyze_data(raw_data_list)
    calculations = analysis_result['calculations']
    summaries = analysis_result['summaries']
    category_counts = analysis_result['category_counts']
    truck_data = analysis_result.get('truck_data', [])
    farm_data = analysis_result.get('farm_data', [])
    
    # Store raw data
    for row_data in raw_data_list:
        raw_data_obj = RawData(
            upload_id=upload.id,
            row_number=row_data.get('row_number', 0),
            no=row_data.get('no'),
            truck_no=row_data.get('truck_no'),
            do_number=row_data.get('do_number'),
            farm=row_data.get('farm'),
            do_quantity=row_data.get('do_quantity'),
            bird_counter=row_data.get('bird_counter'),
            total_slaughter=row_data.get('total_slaughter'),
            doa=row_data.get('doa'),
            non_halal=row_data.get('non_halal')
        )
        db.add(raw_data_obj)
    
    db.commit()
    
    # Store calculations
    raw_data_objs = db.query(RawData).filter(RawData.upload_id == upload.id).all()
    for i, calc_data in enumerate(calculations):
        if i < len(raw_data_objs):
            calc_obj = Calculation(
                upload_id=upload.id,
                raw_data_id=raw_data_objs[i].id,
                total_birds_arrived=calc_data.get('total_birds_arrived'),
                total_birds_slaughtered=calc_data.get('total_birds_slaughtered'),
                total_doa=calc_data.get('total_doa'),
                bird_counter=calc_data.get('bird_counter'),
                birds_arrived_actual=calc_data.get('birds_arrived_actual'),
                missing_birds=calc_data.get('missing_birds'),
                variance=calc_data.get('variance'),
                death_percentage=calc_data.get('death_percentage'),
                missing_birds_percentage=calc_data.get('missing_birds_percentage'),
                variance_percentage=calc_data.get('variance_percentage'),
                remark=calc_data.get('remark')
            )
            db.add(calc_obj)
    
    db.commit()
    
    # Store truck performance
    for truck in truck_data:
        # Convert serial_numbers to strings before joining
        serial_nums = truck.get('serial_numbers', [])
        serial_numbers_str = ', '.join(map(str, serial_nums)) if serial_nums else ''
        
        truck_obj = TruckPerformance(
            upload_id=upload.id,
            truck_no=truck.get('truck_no'),
            serial_numbers=serial_numbers_str,
            total_birds_arrived=truck.get('total_birds_arrived', 0),
            total_birds_slaughtered=truck.get('total_birds_slaughtered', 0),
            total_doa=truck.get('total_doa', 0),
            total_missing_birds=truck.get('total_missing_birds', 0),
            total_variance=truck.get('total_variance', 0),
            death_percentage=truck.get('death_percentage', 0),
            missing_birds_percentage=truck.get('missing_birds_percentage', 0),
            variance_percentage=truck.get('variance_percentage', 0),
            row_count=truck.get('row_count', 0)
        )
        db.add(truck_obj)
    
    # Store farm performance
    for farm in farm_data:
        farm_obj = FarmPerformance(
            upload_id=upload.id,
            farm=farm.get('farm'),
            total_birds_arrived=farm.get('total_birds_arrived', 0),
            total_birds_slaughtered=farm.get('total_birds_slaughtered', 0),
            total_doa=farm.get('total_doa', 0),
            total_missing_birds=farm.get('total_missing_birds', 0),
            total_variance=farm.get('total_variance', 0),
            death_percentage=farm.get('death_percentage', 0),
            missing_birds_percentage=farm.get('missing_birds_percentage', 0),
            variance_percentage=farm.get('variance_percentage', 0),
            row_count=farm.get('row_count', 0)
        )
        db.add(farm_obj)
    
    db.commit()
    
    # Store summaries
    for summary_data in summaries:
        summary_obj = Summary(
            upload_id=upload.id,
            category=summary_data['category'],
            total_birds_arrived=summary_data.get('total_birds_arrived', 0),
            total_birds_slaughtered=summary_data.get('total_birds_slaughtered', 0),
            total_doa=summary_data.get('total_doa', 0),
            total_missing_birds=summary_data.get('total_missing_birds', 0),
            total_variance=summary_data.get('total_variance', 0),
            death_percentage=summary_data.get('death_percentage', 0),
            missing_percentage=summary_data.get('missing_percentage', 0),
            variance_percentage=summary_data.get('variance_percentage', 0)
        )
        db.add(summary_obj)
    
    db.commit()
    
    # Store overall summary (8 new KPIs)
    overall_summary_data = analysis_result.get('overall_summary', {})
    # Check if overall summary already exists for this upload
    existing_overall = db.query(OverallSummary).filter(OverallSummary.upload_id == upload.id).first()
    if existing_overall:
        # Update existing
        existing_overall.total_delivered = overall_summary_data.get('total_delivered', 0)
        existing_overall.total_birds_counted = overall_summary_data.get('total_birds_counted', 0)
        existing_overall.net_difference = overall_summary_data.get('net_difference', 0)
        existing_overall.total_doa = overall_summary_data.get('total_doa', 0)
        existing_overall.doa_percentage = overall_summary_data.get('doa_percentage', 0)
        existing_overall.total_slaughter = overall_summary_data.get('total_slaughter', 0)
        existing_overall.slaughter_yield_percentage = overall_summary_data.get('slaughter_yield_percentage', 0)
        existing_overall.total_non_halal = overall_summary_data.get('total_non_halal', 0)
    else:
        # Create new
        overall_summary_obj = OverallSummary(
            upload_id=upload.id,
            total_delivered=overall_summary_data.get('total_delivered', 0),
            total_birds_counted=overall_summary_data.get('total_birds_counted', 0),
            net_difference=overall_summary_data.get('net_difference', 0),
            total_doa=overall_summary_data.get('total_doa', 0),
            doa_percentage=overall_summary_data.get('doa_percentage', 0),
            total_slaughter=overall_summary_data.get('total_slaughter', 0),
            slaughter_yield_percentage=overall_summary_data.get('slaughter_yield_percentage', 0),
            total_non_halal=overall_summary_data.get('total_non_halal', 0)
        )
        db.add(overall_summary_obj)
    
    db.commit()
    
    # Store historical trends
    historical_trends_data = analysis_result.get('historical_trends', [])
    for trend_data in historical_trends_data:
        trend_obj = HistoricalTrend(
            upload_id=upload.id,
            farm=trend_data.get('farm'),
            do_number=trend_data.get('do_number'),
            difference=trend_data.get('difference', 0),
            do_quantity=trend_data.get('do_quantity', 0),
            counter_plus_doa=trend_data.get('counter_plus_doa', 0),
            slaughter_yield_percentage=trend_data.get('slaughter_yield_percentage', 0),
            upload_date=upload.upload_date
        )
        db.add(trend_obj)
    
    db.commit()
    
    # Create processing history
    history = ProcessingHistory(
        upload_id=upload.id,
        status="success",
        message="Processing completed successfully",
        total_rows_processed=len(raw_data_list),
        broiler_count=category_counts.get('Broiler', 0),
        breeder_count=category_counts.get('Breeder', 0)
    )
    db.add(history)
    
    # Update upload record
    upload.processed = 1
    upload.total_rows = len(raw_data_list)
    
    db.commit()


@app.get("/")
async def root():
    """Root endpoint - redirect to dashboard"""
    index_path = os.path.join(public_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
    # Recursive file listing to find where 'public' went
    file_map = []
    for root, dirs, files in os.walk(os.getcwd()):
        for file in files:
            file_map.append(os.path.join(root, file))
            
    return {
        "error": "Dashboard file not found", 
        "path": index_path, 
        "cwd": os.getcwd(),
        "base_dir": base_dir,
        "public_dir": public_dir,
        "exists": os.path.exists(public_dir),
        "all_files": file_map[:100] # Limit to first 100 to avoid huge response
    }


@app.get("/files")
async def list_files():
    """
    List all Excel files in the uploads folder.
    """
    files = []
    if os.path.exists(UPLOAD_DIR):
        for filename in os.listdir(UPLOAD_DIR):
            if filename.endswith(('.xlsx', '.xls')):
                file_path = os.path.join(UPLOAD_DIR, filename)
                file_stat = os.stat(file_path)
                files.append({
                    "filename": filename,
                    "size": file_stat.st_size,
                    "modified": datetime.fromtimestamp(file_stat.st_mtime).isoformat()
                })
    return {"files": files}


@app.post("/upload", response_model=UploadResponse)
async def register_file(filename: str = Query(..., description="Name of the Excel file in uploads folder"), db: Session = Depends(get_db)):
    """
    Register an existing file from uploads folder.
    Returns upload_id for processing.
    """
    # Validate file type
    if not filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files (.xlsx, .xls) are allowed")
    
    # Check if file exists in uploads folder
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found in uploads folder")
    
    # Check if file is already registered
    existing_upload = db.query(Upload).filter(Upload.filename == filename).first()
    if existing_upload:
        return UploadResponse(
            upload_id=existing_upload.id,
            filename=existing_upload.filename,
            upload_date=existing_upload.upload_date,
            message="File already registered"
        )
    
    # Create upload record
    upload = Upload(
        filename=filename,
        file_path=file_path,
        processed=0,
        total_rows=0
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    
    return UploadResponse(
        upload_id=upload.id,
        filename=upload.filename,
        upload_date=upload.upload_date,
        message="File registered successfully"
    )


@app.get("/latest")
async def get_latest_data(db: Session = Depends(get_db)):
    """
    Get the latest processed upload data.
    If no processed files found, try to process files automatically.
    Returns is_new_file=True if the file was uploaded within the last hour.
    """
    # Get the most recent processed upload
    latest_upload = db.query(Upload).filter(Upload.processed == 1).order_by(Upload.upload_date.desc()).first()
    
    if not latest_upload:
        # Try to find unprocessed files and process them
        unprocessed_upload = db.query(Upload).filter(Upload.processed == 0).order_by(Upload.upload_date.desc()).first()
        
        if unprocessed_upload:
            try:
                print(f"Auto-processing unprocessed file: {unprocessed_upload.filename}")
                await process_file_internal(unprocessed_upload.id, db)
                db.refresh(unprocessed_upload)
                if unprocessed_upload.processed == 1:
                    # Check if this is a new file (uploaded within last hour)
                    time_diff = datetime.utcnow() - unprocessed_upload.upload_date
                    is_new_file = time_diff.total_seconds() < 3600  # 1 hour
                    return {
                        "upload_id": unprocessed_upload.id, 
                        "filename": unprocessed_upload.filename,
                        "is_new_file": is_new_file
                    }
            except Exception as e:
                print(f"Error auto-processing file: {str(e)}")
        
        # Check if there are Excel files in uploads folder that haven't been registered
        if os.path.exists(UPLOAD_DIR):
            excel_files = [f for f in os.listdir(UPLOAD_DIR) if f.endswith(('.xlsx', '.xls'))]
            for filename in excel_files:
                existing = db.query(Upload).filter(Upload.filename == filename).first()
                if not existing:
                    # Register and process the file
                    try:
                        file_path = os.path.join(UPLOAD_DIR, filename)
                        upload = Upload(
                            filename=filename,
                            file_path=file_path,
                            processed=0,
                            total_rows=0
                        )
                        db.add(upload)
                        db.commit()
                        db.refresh(upload)
                        print(f"Auto-registering and processing: {filename}")
                        await process_file_internal(upload.id, db)
                        db.refresh(upload)
                        if upload.processed == 1:
                            # Check if this is a new file (uploaded within last hour)
                            time_diff = datetime.utcnow() - upload.upload_date
                            is_new_file = time_diff.total_seconds() < 3600  # 1 hour
                            return {
                                "upload_id": upload.id, 
                                "filename": upload.filename,
                                "is_new_file": is_new_file
                            }
                    except Exception as e:
                        print(f"Error processing {filename}: {str(e)}")
                        continue
        
        return {"upload_id": None, "message": "No processed files found"}
    
    # Check if this is a new file (uploaded within last hour)
    time_diff = datetime.utcnow() - latest_upload.upload_date
    is_new_file = time_diff.total_seconds() < 3600  # 1 hour
    
    return {
        "upload_id": latest_upload.id, 
        "filename": latest_upload.filename,
        "is_new_file": is_new_file
    }


@app.post("/process/{upload_id}", response_model=ProcessResponse)
async def process_file(upload_id: int, db: Session = Depends(get_db)):
    """
    Process uploaded Excel file.
    Extracts data, performs calculations, and stores in database.
    """
    # Get upload record
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if upload.processed == 1:
        raise HTTPException(status_code=400, detail="File already processed")
    
    try:
        # Extract data from Excel
        extracted_data = process_excel_file(upload.file_path)
        raw_data_list = extracted_data.get('raw_data', [])
        grand_total = extracted_data.get('grand_total')
        
        # Also save the extracted data to JSON in uploads directory for inspection
        import json
        json_path = os.path.join(UPLOAD_DIR, f"extracted_data_{upload.id}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(extracted_data, f, indent=2, ensure_ascii=False, default=str)
        print(f"Extracted data saved to: {json_path}")
        
        if not raw_data_list:
            raise HTTPException(status_code=400, detail="No data found in Excel file")
        
        # Analyze data
        analysis_result = analyze_data(raw_data_list)
        calculations = analysis_result['calculations']
        summaries = analysis_result['summaries']
        category_counts = analysis_result['category_counts']
        
        # Store raw data
        raw_data_objects = []
        for row_data in raw_data_list:
            raw_data_obj = RawData(
                upload_id=upload.id,
                row_number=row_data.get('row_number', 0),
                no=row_data.get('no'),
                truck_no=row_data.get('truck_no'),
                do_number=row_data.get('do_number'),
                farm=row_data.get('farm'),
                do_quantity=row_data.get('do_quantity'),
                bird_counter=row_data.get('bird_counter'),
                total_slaughter=row_data.get('total_slaughter'),
                doa=row_data.get('doa'),
                non_halal=row_data.get('non_halal')
            )
            raw_data_objects.append(raw_data_obj)
            db.add(raw_data_obj)
        
        db.commit()
        
        # Store calculations
        calculation_objects = []
        for i, calc in enumerate(calculations):
            raw_data_obj = raw_data_objects[i]
            calc_obj = Calculation(
                upload_id=upload.id,
                raw_data_id=raw_data_obj.id,
                total_birds_arrived=calc.get('total_birds_arrived'),
                total_birds_slaughtered=calc.get('total_birds_slaughtered'),
                total_doa=calc.get('total_doa'),
                bird_counter=calc.get('bird_counter'),
                birds_arrived_actual=calc.get('birds_arrived_actual'),
                missing_birds=calc.get('missing_birds'),
                variance=calc.get('variance'),
                death_percentage=calc.get('death_percentage'),
                missing_birds_percentage=calc.get('missing_birds_percentage'),
                variance_percentage=calc.get('variance_percentage'),
                remark=calc.get('remark')
            )
            calculation_objects.append(calc_obj)
            db.add(calc_obj)
        
        db.commit()
        
        # Store truck performance
        truck_data = analysis_result.get('truck_data', [])
        for truck in truck_data:
            truck_obj = TruckPerformance(
                upload_id=upload.id,
                truck_no=truck['truck_no'],
                serial_numbers=','.join(map(str, truck.get('serial_numbers', []))),
                total_birds_arrived=truck.get('total_birds_arrived', 0),
                total_birds_slaughtered=truck.get('total_birds_slaughtered', 0),
                total_doa=truck.get('total_doa', 0),
                total_bird_counter=truck.get('total_bird_counter', 0),
                total_missing_birds=truck.get('total_missing_birds', 0),
                total_variance=truck.get('total_variance', 0),
                death_percentage=truck.get('death_percentage', 0),
                missing_birds_percentage=truck.get('missing_birds_percentage', 0),
                variance_percentage=truck.get('variance_percentage', 0),
                row_count=truck.get('row_count', 0)
            )
            db.add(truck_obj)
        
        db.commit()
        
        # Store farm performance
        farm_data = analysis_result.get('farm_data', [])
        for farm in farm_data:
            farm_obj = FarmPerformance(
                upload_id=upload.id,
                farm=farm['farm'],
                total_birds_arrived=farm.get('total_birds_arrived', 0),
                total_birds_slaughtered=farm.get('total_birds_slaughtered', 0),
                total_doa=farm.get('total_doa', 0),
                total_missing_birds=farm.get('total_missing_birds', 0),
                total_variance=farm.get('total_variance', 0),
                death_percentage=farm.get('death_percentage', 0),
                missing_birds_percentage=farm.get('missing_birds_percentage', 0),
                variance_percentage=farm.get('variance_percentage', 0),
                row_count=farm.get('row_count', 0)
            )
            db.add(farm_obj)
        
        db.commit()
        
        # Store summaries
        for summary_data in summaries:
            summary_obj = Summary(
                upload_id=upload.id,
                category=summary_data['category'],
                total_birds_arrived=summary_data.get('total_birds_arrived', 0),
                total_birds_slaughtered=summary_data.get('total_birds_slaughtered', 0),
                total_doa=summary_data.get('total_doa', 0),
                total_missing_birds=summary_data.get('total_missing_birds', 0),
                total_variance=summary_data.get('total_variance', 0),
                death_percentage=summary_data.get('death_percentage', 0),
                missing_percentage=summary_data.get('missing_percentage', 0),
                variance_percentage=summary_data.get('variance_percentage', 0)
            )
            db.add(summary_obj)
        
        db.commit()
        
        # Create processing history
        history = ProcessingHistory(
            upload_id=upload.id,
            status="success",
            message="Processing completed successfully",
            total_rows_processed=len(raw_data_list),
            broiler_count=category_counts.get('Broiler', 0),
            breeder_count=category_counts.get('Breeder', 0)
        )
        db.add(history)
        
        # Update upload record
        upload.processed = 1
        upload.total_rows = len(raw_data_list)
        
        db.commit()
        db.refresh(history)
        
        return ProcessResponse(
            upload_id=upload.id,
            status="success",
            message="File processed successfully",
            total_rows=len(raw_data_list),
            broiler_count=category_counts.get('Broiler', 0),
            breeder_count=category_counts.get('Breeder', 0),
            processing_history_id=history.id
        )
    
    except Exception as e:
        # Create error history
        history = ProcessingHistory(
            upload_id=upload.id,
            status="error",
            message=str(e),
            total_rows_processed=0,
            broiler_count=0,
            breeder_count=0
        )
        db.add(history)
        db.commit()
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@app.get("/data/{upload_id}", response_model=DataResponse)
async def get_data(upload_id: int, db: Session = Depends(get_db)):
    """
    Get processed data for a specific upload.
    """
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    if upload.processed == 0:
        raise HTTPException(status_code=400, detail="File not processed yet")
    
    # Get raw data
    raw_data_objs = db.query(RawData).filter(RawData.upload_id == upload_id).all()
    raw_data_list = [RawDataModel.model_validate({
        'id': obj.id,
        'row_number': obj.row_number,
        'no': obj.no,
        'truck_no': obj.truck_no,
        'do_number': obj.do_number,
        'farm': obj.farm,
        'do_quantity': obj.do_quantity,
        'bird_counter': obj.bird_counter,
        'total_slaughter': obj.total_slaughter,
        'doa': obj.doa,
        'non_halal': obj.non_halal
    }) for obj in raw_data_objs]
    
    # Get calculations
    calc_objs = db.query(Calculation).filter(Calculation.upload_id == upload_id).all()
    calculations_list = [CalculationModel.model_validate({
        'id': obj.id,
        'raw_data_id': obj.raw_data_id,
        'total_birds_arrived': obj.total_birds_arrived,
        'total_birds_slaughtered': obj.total_birds_slaughtered,
        'total_doa': obj.total_doa,
        'bird_counter': obj.bird_counter,
        'birds_arrived_actual': obj.birds_arrived_actual,
        'missing_birds': obj.missing_birds,
        'variance': obj.variance,
        'death_percentage': obj.death_percentage,
        'missing_birds_percentage': obj.missing_birds_percentage,
        'variance_percentage': obj.variance_percentage,
        'remark': obj.remark
    }) for obj in calc_objs]
    
    # Get summaries
    summary_objs = db.query(Summary).filter(Summary.upload_id == upload_id).all()
    summaries_list = [SummaryModel.model_validate({
        'id': obj.id,
        'category': obj.category,
        'total_birds_arrived': obj.total_birds_arrived,
        'total_birds_slaughtered': obj.total_birds_slaughtered,
        'total_doa': obj.total_doa,
        'total_missing_birds': obj.total_missing_birds,
        'total_variance': obj.total_variance,
        'death_percentage': obj.death_percentage,
        'missing_percentage': obj.missing_percentage,
        'variance_percentage': obj.variance_percentage
    }) for obj in summary_objs]
    
    return DataResponse(
        upload_id=upload.id,
        filename=upload.filename,
        upload_date=upload.upload_date,
        raw_data=raw_data_list,
        calculations=calculations_list,
        summaries=summaries_list
    )


@app.get("/history", response_model=HistoryResponse)
async def get_history(db: Session = Depends(get_db)):
    """
    Get processing history for all uploads.
    """
    history_objs = db.query(ProcessingHistory).join(Upload).order_by(ProcessingHistory.process_date.desc()).all()
    
    history_items = []
    for hist in history_objs:
        upload = db.query(Upload).filter(Upload.id == hist.upload_id).first()
        history_items.append(HistoryItem.model_validate({
            'id': hist.id,
            'upload_id': hist.upload_id,
            'filename': upload.filename if upload else "Unknown",
            'process_date': hist.process_date,
            'status': hist.status,
            'total_rows_processed': hist.total_rows_processed,
            'broiler_count': hist.broiler_count,
            'breeder_count': hist.breeder_count
        }))
    
    return HistoryResponse(history=history_items)


@app.get("/summary/{upload_id}", response_model=SummaryResponse)
async def get_summary(
    upload_id: int, 
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """
    Get summary data for a specific upload or aggregated data from last N days or date range.
    If start_date and end_date are provided, aggregates data from all uploads in that range.
    If days is provided, aggregates data from all uploads in that range.
    """
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Use aggregation function
    aggregated = aggregate_summary(db, upload_ids)
    
    # Use first upload for upload_id in response (or specific upload_id if not aggregating)
    response_upload_id = upload_id if not days else uploads[0].id
    
    return SummaryResponse(
        upload_id=response_upload_id,
        summaries=[SummaryModel.model_validate(s) for s in aggregated['summaries']],
        grand_total=aggregated['grand_total']
    )


@app.get("/trucks/{upload_id}")
async def get_truck_performance(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get truck-wise performance data, optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Use aggregation function
    truck_list = aggregate_truck_performance(db, upload_ids)
    
    return {'trucks': [TruckPerformanceModel.model_validate(t) for t in truck_list]}


@app.get("/farms/{upload_id}")
async def get_farm_performance(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get farm-wise performance data, optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Use aggregation function
    farm_list = aggregate_farm_performance(db, upload_ids)
    
    return {'farms': [FarmPerformanceModel.model_validate(f) for f in farm_list]}


@app.get("/overall-summary/{upload_id}")
async def get_overall_summary(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get overall summary KPIs (8 new KPIs), optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Use aggregation function
    aggregated = aggregate_overall_summary(db, upload_ids)
    
    if not aggregated:
        raise HTTPException(status_code=404, detail="Overall summary not found")
    
    # Use first upload for upload_id in response
    response_upload_id = upload_id if not days else uploads[0].id
    
    return OverallSummaryModel.model_validate({
        'id': 0,  # Aggregated data doesn't have a single ID
        'upload_id': response_upload_id,
        **aggregated
    })


@app.get("/delivered-vs-received/{upload_id}")
async def get_delivered_vs_received(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get delivered vs received comparison by farm, optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Get raw data and calculations from all uploads
    raw_data_objs = db.query(RawData).filter(RawData.upload_id.in_(upload_ids)).all()
    calc_objs = db.query(Calculation).filter(Calculation.upload_id.in_(upload_ids)).all()
    
    # Convert to dict format for analyzer
    raw_data_list = [{
        'farm': r.farm,
        'do_quantity': r.do_quantity or 0
    } for r in raw_data_objs]
    
    calculations = [{
        'bird_counter': c.bird_counter or 0,
        'total_doa': c.total_doa or 0
    } for c in calc_objs]
    
    # Use analyzer to calculate
    from api.data_analyzer import DataAnalyzer
    analyzer = DataAnalyzer()
    result = analyzer.get_delivered_vs_received_by_farm(raw_data_list, calculations)
    
    return {'data': result}


@app.get("/slaughter-yield/{upload_id}")
async def get_slaughter_yield(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get slaughter yield percentage by farm, optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Get raw data and calculations from all uploads
    raw_data_objs = db.query(RawData).filter(RawData.upload_id.in_(upload_ids)).all()
    calc_objs = db.query(Calculation).filter(Calculation.upload_id.in_(upload_ids)).all()
    
    # Convert to dict format for analyzer
    raw_data_list = [{
        'farm': r.farm
    } for r in raw_data_objs]
    
    calculations = [{
        'total_birds_slaughtered': c.total_birds_slaughtered or 0,
        'bird_counter': c.bird_counter or 0,
        'total_doa': c.total_doa or 0
    } for c in calc_objs]
    
    # Use analyzer to calculate
    from api.data_analyzer import DataAnalyzer
    analyzer = DataAnalyzer()
    result = analyzer.get_slaughter_yield_by_farm(raw_data_list, calculations)
    
    return {'data': result}


@app.get("/truck-alerts/{upload_id}")
async def get_truck_alerts(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """Get truck-wise delivery & alerts with all columns, optionally aggregated from last N days or date range"""
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Get raw data and calculations from all uploads
    raw_data_objs = db.query(RawData).filter(RawData.upload_id.in_(upload_ids)).all()
    calc_objs = db.query(Calculation).filter(Calculation.upload_id.in_(upload_ids)).all()
    
    # Create mapping of raw_data_id to calculation
    calc_map = {c.raw_data_id: c for c in calc_objs}
    
    truck_alerts = []
    for raw_data in raw_data_objs:
        calc = calc_map.get(raw_data.id)
        if not calc:
            continue
        
        bird_counter = calc.bird_counter or 0
        doa = calc.total_doa or 0
        counter_plus_doa = bird_counter + doa
        do_quantity = raw_data.do_quantity or 0
        difference = counter_plus_doa - do_quantity
        total_slaughter = calc.total_birds_slaughtered or 0
        yield_percentage = (total_slaughter / counter_plus_doa * 100) if counter_plus_doa > 0 else 0
        doa_percentage = (doa / counter_plus_doa * 100) if counter_plus_doa > 0 else 0
        
        # Status: red if Difference < 0 or DOA % > 5
        status = "OK"
        if difference < 0 or doa_percentage > 5:
            status = "ALERT"
        
        truck_alerts.append({
            'truck': raw_data.truck_no or 'Unknown',
            'do_number': raw_data.do_number or '',
            'farm': raw_data.farm or 'Unknown',
            'do_quantity': do_quantity,
            'counter': bird_counter,
            'slaughtered': total_slaughter,
            'doa': doa,
            'non_halal': raw_data.non_halal or 0,
            'counter_plus_doa': counter_plus_doa,
            'difference': difference,
            'yield_percentage': round(yield_percentage, 2),
            'status': status,
            'doa_percentage': round(doa_percentage, 2)
        })
    
    return {'trucks': truck_alerts}


@app.get("/historical-trends/{upload_id}")
async def get_historical_trends_by_upload(upload_id: int, db: Session = Depends(get_db)):
    """Get historical trends for a specific upload"""
    upload = db.query(Upload).filter(Upload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    trend_objs = db.query(HistoricalTrend).filter(HistoricalTrend.upload_id == upload_id).all()
    trends_list = []
    for obj in trend_objs:
        trends_list.append(HistoricalTrendModel.model_validate({
            'id': obj.id,
            'upload_id': obj.upload_id,
            'farm': obj.farm,
            'do_number': obj.do_number,
            'difference': obj.difference,
            'do_quantity': obj.do_quantity,
            'counter_plus_doa': obj.counter_plus_doa,
            'slaughter_yield_percentage': obj.slaughter_yield_percentage,
            'upload_date': obj.upload_date
        }))
    
    return HistoricalTrendsResponse(trends=trends_list)


@app.get("/historical-trends")
async def get_all_historical_trends(
    farm: Optional[str] = Query(None, description="Filter by farm"),
    do_number: Optional[str] = Query(None, description="Filter by D/O number"),
    db: Session = Depends(get_db)
):
    """Get all historical trends (for historical data viewer)"""
    query = db.query(HistoricalTrend)
    
    if farm:
        query = query.filter(HistoricalTrend.farm == farm)
    if do_number:
        query = query.filter(HistoricalTrend.do_number == do_number)
    
    trend_objs = query.order_by(HistoricalTrend.upload_date.asc()).all()
    trends_list = []
    for obj in trend_objs:
        trends_list.append(HistoricalTrendModel.model_validate({
            'id': obj.id,
            'upload_id': obj.upload_id,
            'farm': obj.farm,
            'do_number': obj.do_number,
            'difference': obj.difference,
            'do_quantity': obj.do_quantity,
            'counter_plus_doa': obj.counter_plus_doa,
            'slaughter_yield_percentage': obj.slaughter_yield_percentage,
            'upload_date': obj.upload_date
        }))
    
    return HistoricalTrendsResponse(trends=trends_list)


@app.get("/api/uploads")
async def get_uploads(db: Session = Depends(get_db)):
    """
    Get all processed uploads with their metadata.
    Returns list of uploads with id, filename, upload_date, and processed status.
    """
    uploads = db.query(Upload).filter(Upload.processed == 1).order_by(Upload.upload_date.desc()).all()
    
    uploads_list = []
    for upload in uploads:
        uploads_list.append({
            'id': upload.id,
            'filename': upload.filename,
            'upload_date': upload.upload_date.isoformat() if upload.upload_date else None,
            'processed': upload.processed,
            'total_rows': upload.total_rows
        })
    
    return uploads_list


@app.get("/verify-database")
async def verify_database(db: Session = Depends(get_db)):
    """
    Verify if data is stored in the database.
    Returns counts of records in each table.
    """
    try:
        uploads_count = db.query(Upload).count()
        raw_data_count = db.query(RawData).count()
        calculations_count = db.query(Calculation).count()
        summaries_count = db.query(Summary).count()
        truck_performance_count = db.query(TruckPerformance).count()
        farm_performance_count = db.query(FarmPerformance).count()
        overall_summary_count = db.query(OverallSummary).count()
        historical_trends_count = db.query(HistoricalTrend).count()
        processing_history_count = db.query(ProcessingHistory).count()
        
        # Get sample data
        latest_upload = db.query(Upload).order_by(Upload.upload_date.desc()).first()
        sample_upload_id = latest_upload.id if latest_upload else None
        
        sample_data = {}
        if sample_upload_id:
            sample_data = {
                "latest_upload": {
                    "id": latest_upload.id,
                    "filename": latest_upload.filename,
                    "upload_date": latest_upload.upload_date.isoformat() if latest_upload.upload_date else None,
                    "processed": latest_upload.processed,
                    "total_rows": latest_upload.total_rows
                },
                "raw_data_samples": db.query(RawData).filter(RawData.upload_id == sample_upload_id).limit(3).count(),
                "historical_trends_samples": db.query(HistoricalTrend).filter(HistoricalTrend.upload_id == sample_upload_id).limit(3).count()
            }
        
        return {
            "status": "success",
            "database_file": DATABASE_URL.replace("sqlite:///", ""),
            "table_counts": {
                "uploads": uploads_count,
                "raw_data": raw_data_count,
                "calculations": calculations_count,
                "summaries": summaries_count,
                "truck_performance": truck_performance_count,
                "farm_performance": farm_performance_count,
                "overall_summary": overall_summary_count,
                "historical_trends": historical_trends_count,
                "processing_history": processing_history_count
            },
            "sample_data": sample_data,
            "message": "Database verification completed"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "message": "Failed to verify database"
        }


@app.get("/truck-farm-variance/{upload_id}")
async def get_truck_farm_variance(
    upload_id: int,
    days: Optional[int] = Query(None, description="Aggregate data from last N days (overrides upload_id)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD) for date range filter"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD) for date range filter"),
    db: Session = Depends(get_db)
):
    """
    Get truck-farm variance matrix for heat map.
    Returns variance percentage for each truck-farm combination.
    """
    uploads = get_uploads_in_date_range(db, days=days, upload_id=upload_id if not days and not start_date else None,
                                        start_date=start_date, end_date=end_date)
    
    if not uploads:
        raise HTTPException(status_code=404, detail="No uploads found")
    
    upload_ids = [u.id for u in uploads]
    
    # Get raw data and calculations from all uploads
    raw_data_objs = db.query(RawData).filter(RawData.upload_id.in_(upload_ids)).all()
    calc_objs = db.query(Calculation).filter(Calculation.upload_id.in_(upload_ids)).all()
    
    # Create mapping of raw_data_id to calculation
    calc_map = {c.raw_data_id: c for c in calc_objs}
    
    # Build truck-farm variance matrix
    truck_farm_data = {}  # {truck_no: {farm: {variance, variance_percentage, count}}}
    
    for raw_data in raw_data_objs:
        calc = calc_map.get(raw_data.id)
        if not calc:
            continue
        
        truck_no = raw_data.truck_no or 'Unknown'
        farm = raw_data.farm or 'Unknown'
        
        if truck_no not in truck_farm_data:
            truck_farm_data[truck_no] = {}
        
        if farm not in truck_farm_data[truck_no]:
            truck_farm_data[truck_no][farm] = {
                'total_variance': 0,
                'total_do_quantity': 0,
                'count': 0
            }
        
        # Aggregate variance and D/O quantity
        truck_farm_data[truck_no][farm]['total_variance'] += calc.variance or 0
        truck_farm_data[truck_no][farm]['total_do_quantity'] += raw_data.do_quantity or 0
        truck_farm_data[truck_no][farm]['count'] += 1
    
    # Calculate variance percentages
    result = []
    all_farms = set()
    all_trucks = set()
    
    for truck_no, farms_data in truck_farm_data.items():
        all_trucks.add(truck_no)
        for farm, data in farms_data.items():
            all_farms.add(farm)
            variance_percentage = 0
            if data['total_do_quantity'] > 0:
                variance_percentage = (data['total_variance'] / data['total_do_quantity']) * 100
            
            result.append({
                'truck_no': truck_no,
                'farm': farm,
                'variance': data['total_variance'],
                'variance_percentage': round(variance_percentage, 2),
                'count': data['count']
            })
    
    return {
        'data': result,
        'trucks': sorted(list(all_trucks)),
        'farms': sorted(list(all_farms))
    }





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

