"""
Pydantic models for API requests and responses.
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class UploadResponse(BaseModel):
    """Response model for file upload"""
    upload_id: int
    filename: str
    upload_date: datetime
    message: str
    
    class Config:
        from_attributes = True


class RawDataModel(BaseModel):
    """Model for raw data row"""
    id: Optional[int] = None
    row_number: int
    no: Optional[int] = None
    truck_no: Optional[str] = None
    do_number: Optional[str] = None
    farm: Optional[str] = None
    do_quantity: Optional[int] = None
    bird_counter: Optional[int] = None
    total_slaughter: Optional[int] = None
    doa: Optional[int] = None
    non_halal: Optional[int] = None
    
    class Config:
        from_attributes = True


class CalculationModel(BaseModel):
    """Model for calculated fields and KPIs"""
    id: Optional[int] = None
    raw_data_id: int
    total_birds_arrived: Optional[int] = None
    total_birds_slaughtered: Optional[int] = None
    total_doa: Optional[int] = None
    bird_counter: Optional[int] = None
    birds_arrived_actual: Optional[int] = None
    missing_birds: Optional[int] = None
    variance: Optional[int] = None
    death_percentage: Optional[float] = None
    missing_birds_percentage: Optional[float] = None
    variance_percentage: Optional[float] = None
    remark: Optional[str] = None
    
    class Config:
        from_attributes = True


class SummaryModel(BaseModel):
    """Model for category summary"""
    id: Optional[int] = None
    category: str
    total_birds_arrived: int
    total_birds_slaughtered: int
    total_doa: int
    total_missing_birds: int
    total_variance: int
    death_percentage: float
    missing_percentage: float
    variance_percentage: float
    
    class Config:
        from_attributes = True


class TruckPerformanceModel(BaseModel):
    """Model for truck-wise performance"""
    id: Optional[int] = None
    truck_no: str
    serial_numbers: List[int]
    total_birds_arrived: int
    total_birds_slaughtered: int
    total_doa: int
    total_bird_counter: int
    total_missing_birds: int
    total_variance: int
    death_percentage: float
    missing_birds_percentage: float
    variance_percentage: float
    row_count: int
    
    class Config:
        from_attributes = True


class FarmPerformanceModel(BaseModel):
    """Model for farm-wise performance"""
    id: Optional[int] = None
    farm: str
    total_birds_arrived: int
    total_birds_slaughtered: int
    total_doa: int
    total_missing_birds: int
    total_variance: int
    death_percentage: float
    missing_birds_percentage: float
    variance_percentage: float
    row_count: int
    
    class Config:
        from_attributes = True


class ProcessResponse(BaseModel):
    """Response model for processing"""
    upload_id: int
    status: str
    message: str
    total_rows: int
    broiler_count: int
    breeder_count: int
    processing_history_id: int


class DataResponse(BaseModel):
    """Response model for getting processed data"""
    upload_id: int
    filename: str
    upload_date: datetime
    raw_data: List[RawDataModel]
    calculations: List[CalculationModel]
    summaries: List[SummaryModel]


class HistoryItem(BaseModel):
    """Model for processing history item"""
    id: int
    upload_id: int
    filename: str
    process_date: datetime
    status: str
    total_rows_processed: int
    broiler_count: int
    breeder_count: int
    
    class Config:
        from_attributes = True


class HistoryResponse(BaseModel):
    """Response model for processing history"""
    history: List[HistoryItem]


class SummaryResponse(BaseModel):
    """Response model for summary data"""
    upload_id: int
    summaries: List[SummaryModel]
    grand_total: dict


class OverallSummaryModel(BaseModel):
    """Model for overall summary KPIs"""
    id: Optional[int] = None
    upload_id: int
    total_delivered: int
    total_birds_counted: int
    net_difference: int
    total_doa: int
    doa_percentage: float
    total_slaughter: int
    slaughter_yield_percentage: float
    total_non_halal: int = 0
    
    class Config:
        from_attributes = True


class HistoricalTrendModel(BaseModel):
    """Model for historical trend data"""
    id: Optional[int] = None
    upload_id: int
    farm: Optional[str] = None
    do_number: Optional[str] = None
    difference: int
    do_quantity: int
    counter_plus_doa: int
    slaughter_yield_percentage: float
    upload_date: datetime
    
    class Config:
        from_attributes = True


class HistoricalTrendsResponse(BaseModel):
    """Response model for historical trends"""
    trends: List[HistoricalTrendModel]

