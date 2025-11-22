# Poultry Processing Dashboard

A comprehensive web dashboard for analyzing poultry processing data from Excel files. The system extracts data, performs calculations, visualizes key metrics, and stores everything in SQLite for historical tracking.

## Features

- **Excel File Upload**: Drag-and-drop or browse to upload Excel files (.xlsx, .xls)
- **Data Processing**: Automatic extraction and analysis of poultry processing data
- **Calculations**: 
  - Counter + DOA (Bird Counter + Dead on Arrival)
  - Difference calculation (Counter + DOA - D/O Quantity)
  - Auto-categorization (Broiler vs Breeder)
- **Visualizations**:
  - D/O Quantity vs Counter + DOA comparison chart
  - DOA (Dead on Arrival) trends
  - Farm-wise breakdown
  - Truck-wise analysis
  - Broiler vs Breeder summary comparison
  - Discrepancy distribution
- **Data Storage**: All data stored in SQLite including:
  - Raw uploaded data
  - Calculated fields
  - Category summaries
  - Processing history
- **Historical View**: View and compare past uploads and analyses

## Technology Stack

- **Backend**: FastAPI (Python)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite with SQLAlchemy ORM
- **Visualization**: Chart.js
- **Excel Processing**: openpyxl, pandas

## Installation

1. **Clone or navigate to the project directory**

2. **Install Python dependencies**:
```bash
pip install -r requirements.txt
```

## Running the Application

1. **Start the FastAPI server**:
```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Open your browser** and navigate to:
```
http://localhost:8000
```

## Usage

1. **Upload Excel File**:
   - Drag and drop an Excel file onto the upload area, or click "Browse Files"
   - Supported formats: .xlsx, .xls

2. **Process File**:
   - Click the "Process File" button
   - The system will extract data, perform calculations, and store results

3. **View Visualizations**:
   - After processing, various charts and graphs will be displayed
   - Scroll down to see the data table

4. **View History**:
   - Click "Load History" to see all past processing runs
   - Click on any history item to view its data and visualizations

## Data Structure

The system expects Excel files with the following structure:

- **Primary Data Columns**: NO, TRUCK NO, D/O Number, FARM, D/O Quantity, BIRD COUNTER, TOTAL SLAUGHTER, DOA, NON HALAL
- **Header Row**: Typically row 3
- **Data Rows**: Starting from row 4 until "GRAND TOTAL" or empty row

## API Endpoints

- `POST /upload` - Upload an Excel file
- `POST /process/{upload_id}` - Process uploaded file
- `GET /data/{upload_id}` - Get processed data
- `GET /summary/{upload_id}` - Get summary data
- `GET /history` - Get processing history
- `GET /dashboard` - Serve dashboard HTML

## Database Schema

The SQLite database includes the following tables:

- **uploads**: File metadata
- **raw_data**: Extracted rows from Excel
- **calculations**: Calculated fields (Counter + DOA, Different)
- **summaries**: Category summaries (Broiler/Breeder)
- **processing_history**: Processing run history

## Project Structure

```
.
├── main.py                 # FastAPI application
├── database.py            # Database models and operations
├── models.py              # Pydantic models
├── excel_processor.py     # Excel file parser
├── data_analyzer.py       # Data analysis and calculations
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html        # Frontend HTML
│   ├── styles.css        # CSS styling
│   ├── app.js           # Frontend JavaScript (API integration)
│   └── charts.js        # Chart.js visualizations
└── uploads/              # Uploaded files directory (created automatically)
```

## Notes

- The database file (`poultry_dashboard.db`) will be created automatically on first run
- Uploaded files are stored in the `uploads/` directory
- The system automatically categorizes data as Broiler or Breeder based on farm names and other indicators

## Troubleshooting

- **File upload fails**: Ensure the file is a valid Excel file (.xlsx or .xls)
- **Processing fails**: Check that the Excel file has the expected structure with proper headers
- **Charts not displaying**: Ensure JavaScript is enabled and check browser console for errors
- **CORS errors**: The API is configured to allow all origins. For production, update CORS settings in `main.py`

## License

This project is provided as-is for poultry processing data analysis.




