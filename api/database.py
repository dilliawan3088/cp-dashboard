"""
Database models and operations for poultry processing dashboard.
Uses Neon/PostgreSQL database (requires DATABASE_URL environment variable).
"""
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

Base = declarative_base()

# Database configuration
# Require DATABASE_URL for Neon/PostgreSQL (no SQLite fallback)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError(
        "DATABASE_URL environment variable is required. "
        "Please set it to your Neon database connection string.\n"
        "Example: postgresql://user:password@host:port/database?sslmode=require\n"
        "Get your connection string from: https://console.neon.tech"
    )

# Strip whitespace to prevent connection issues
DATABASE_URL = DATABASE_URL.strip()

# Ensure connection string uses postgresql:// (not postgres://) for SQLAlchemy 2.0+
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine for PostgreSQL/Neon
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Upload(Base):
    """Store uploaded file metadata"""
    __tablename__ = "uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=False)
    processed = Column(Integer, default=0)  # 0 = not processed, 1 = processed
    total_rows = Column(Integer, default=0)
    
    # Relationships
    raw_data = relationship("RawData", back_populates="upload", cascade="all, delete-orphan")
    calculations = relationship("Calculation", back_populates="upload", cascade="all, delete-orphan")
    summaries = relationship("Summary", back_populates="upload", cascade="all, delete-orphan")
    truck_performance = relationship("TruckPerformance", back_populates="upload", cascade="all, delete-orphan")
    farm_performance = relationship("FarmPerformance", back_populates="upload", cascade="all, delete-orphan")
    processing_history = relationship("ProcessingHistory", back_populates="upload", cascade="all, delete-orphan")
    overall_summary = relationship("OverallSummary", back_populates="upload", uselist=False, cascade="all, delete-orphan")
    historical_trends = relationship("HistoricalTrend", back_populates="upload", cascade="all, delete-orphan")


class RawData(Base):
    """Store all extracted rows from Excel"""
    __tablename__ = "raw_data"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    row_number = Column(Integer, nullable=False)
    no = Column(Integer)
    truck_no = Column(String)
    do_number = Column(String)
    farm = Column(String)
    do_quantity = Column(Integer)
    bird_counter = Column(Integer)
    total_slaughter = Column(Integer)
    doa = Column(Integer)
    non_halal = Column(Integer)
    
    # Relationships
    upload = relationship("Upload", back_populates="raw_data")


class Calculation(Base):
    """Store calculated fields and KPIs for each row"""
    __tablename__ = "calculations"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    raw_data_id = Column(Integer, ForeignKey("raw_data.id"), nullable=False)
    total_birds_arrived = Column(Integer)
    total_birds_slaughtered = Column(Integer)
    total_doa = Column(Integer)
    bird_counter = Column(Integer)
    birds_arrived_actual = Column(Integer)
    missing_birds = Column(Integer)
    variance = Column(Integer)
    death_percentage = Column(Float)
    missing_birds_percentage = Column(Float)
    variance_percentage = Column(Float)
    remark = Column(String, nullable=True)
    
    # Relationships
    upload = relationship("Upload", back_populates="calculations")


class Summary(Base):
    """Store category summaries (Broiler/Breeder)"""
    __tablename__ = "summaries"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    category = Column(String, nullable=False)  # "Broiler" or "Breeder"
    total_birds_arrived = Column(Integer, default=0)
    total_birds_slaughtered = Column(Integer, default=0)
    total_doa = Column(Integer, default=0)
    total_missing_birds = Column(Integer, default=0)
    total_variance = Column(Integer, default=0)
    death_percentage = Column(Float, default=0)
    missing_percentage = Column(Float, default=0)
    variance_percentage = Column(Float, default=0)
    
    # Relationships
    upload = relationship("Upload", back_populates="summaries")


class TruckPerformance(Base):
    """Store truck-wise performance metrics"""
    __tablename__ = "truck_performance"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    truck_no = Column(String, nullable=False)
    serial_numbers = Column(String, nullable=True)  # JSON array of serial numbers
    total_birds_arrived = Column(Integer, default=0)
    total_birds_slaughtered = Column(Integer, default=0)
    total_doa = Column(Integer, default=0)
    total_bird_counter = Column(Integer, default=0)
    total_missing_birds = Column(Integer, default=0)
    total_variance = Column(Integer, default=0)
    death_percentage = Column(Float, default=0)
    missing_birds_percentage = Column(Float, default=0)
    variance_percentage = Column(Float, default=0)
    row_count = Column(Integer, default=0)
    
    # Relationships
    upload = relationship("Upload", back_populates="truck_performance")


class FarmPerformance(Base):
    """Store farm-wise performance metrics"""
    __tablename__ = "farm_performance"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    farm = Column(String, nullable=False)
    total_birds_arrived = Column(Integer, default=0)
    total_birds_slaughtered = Column(Integer, default=0)
    total_doa = Column(Integer, default=0)
    total_missing_birds = Column(Integer, default=0)
    total_variance = Column(Integer, default=0)
    death_percentage = Column(Float, default=0)
    missing_birds_percentage = Column(Float, default=0)
    variance_percentage = Column(Float, default=0)
    row_count = Column(Integer, default=0)
    
    # Relationships
    upload = relationship("Upload", back_populates="farm_performance")


class ProcessingHistory(Base):
    """Track all processing runs"""
    __tablename__ = "processing_history"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    process_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, nullable=False)  # "success", "error"
    message = Column(Text, nullable=True)
    total_rows_processed = Column(Integer, default=0)
    broiler_count = Column(Integer, default=0)
    breeder_count = Column(Integer, default=0)
    
    # Relationships
    upload = relationship("Upload", back_populates="processing_history")


class OverallSummary(Base):
    """Store overall KPIs for each upload (8 new KPIs)"""
    __tablename__ = "overall_summary"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False, unique=True)
    total_delivered = Column(Integer, default=0)  # SUM(D/O Quantity)
    total_birds_counted = Column(Integer, default=0)  # SUM(Counter + DOA)
    net_difference = Column(Integer, default=0)  # SUM(Counter + DOA - D/O Quantity)
    total_doa = Column(Integer, default=0)  # SUM(DOA)
    doa_percentage = Column(Float, default=0)  # (SUM(DOA) / SUM(Counter + DOA)) * 100
    total_slaughter = Column(Integer, default=0)  # SUM(TOTAL SLAUGHTER)
    slaughter_yield_percentage = Column(Float, default=0)  # (SUM(TOTAL SLAUGHTER) / SUM(Counter + DOA)) * 100
    total_non_halal = Column(Integer, default=0)  # SUM(Non-Halal)
    
    # Relationships
    upload = relationship("Upload", back_populates="overall_summary")


class HistoricalTrend(Base):
    """Store historical trend data for farms and D/O numbers over time"""
    __tablename__ = "historical_trends"
    
    id = Column(Integer, primary_key=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=False)
    farm = Column(String, nullable=True)  # NULL if tracking by D/O
    do_number = Column(String, nullable=True)  # NULL if tracking by Farm
    difference = Column(Integer, default=0)  # D/O Quantity - (Counter + DOA)
    do_quantity = Column(Integer, default=0)
    counter_plus_doa = Column(Integer, default=0)
    slaughter_yield_percentage = Column(Float, default=0)
    upload_date = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    upload = relationship("Upload", back_populates="historical_trends")


def init_db():
    """Initialize database - create all tables if they don't exist"""
    # Only create tables if they don't exist - don't drop existing data!
    # In production, you'd want proper migrations
    Base.metadata.create_all(bind=engine)


def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")

