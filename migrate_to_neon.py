"""
Migration script to transfer data from SQLite to Neon (PostgreSQL) database.
This script preserves all data and maintains the same schema structure.
"""
import os
import sys
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Import database models and Base
from api.database import (
    Base, Upload, RawData, Calculation, Summary,
    TruckPerformance, FarmPerformance, ProcessingHistory,
    OverallSummary, HistoricalTrend
)

def get_sqlite_engine():
    """Get SQLite engine for source database"""
    # Check if running on Vercel
    IS_VERCEL = os.environ.get("VERCEL") == "1"
    
    if IS_VERCEL:
        DB_FILE = "/tmp/poultry_dashboard.db"
    else:
        DB_FILE = "./poultry_dashboard.db"
    
    sqlite_url = f"sqlite:///{DB_FILE}"
    return create_engine(sqlite_url, connect_args={"check_same_thread": False})

def get_neon_engine():
    """Get Neon/PostgreSQL engine for target database"""
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Please set it to your Neon database connection string.\n"
            "Example: postgresql://user:password@host:port/database?sslmode=require"
        )
    
    # Strip whitespace to prevent connection issues
    database_url = database_url.strip()
    
    # Ensure connection string uses postgresql:// (not postgres://) for SQLAlchemy 2.0+
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    return create_engine(database_url, pool_pre_ping=True)

def verify_table_exists(engine, table_name):
    """Check if a table exists in the database"""
    inspector = inspect(engine)
    return table_name in inspector.get_table_names()

def get_table_count(session, model_class):
    """Get the number of rows in a table"""
    return session.query(model_class).count()

def migrate_table(session_sqlite, session_neon, model_class, table_name, order_key=None):
    """
    Migrate data from SQLite to Neon for a specific table.
    
    Args:
        session_sqlite: SQLite database session
        session_neon: Neon database session
        model_class: SQLAlchemy model class
        table_name: Name of the table
        order_key: Optional key to order by (for consistent migration)
    """
    print(f"\n📦 Migrating {table_name}...")
    
    # Get all records from SQLite
    if order_key:
        records = session_sqlite.query(model_class).order_by(order_key).all()
    else:
        records = session_sqlite.query(model_class).all()
    
    count = len(records)
    print(f"   Found {count} records in SQLite")
    
    if count == 0:
        print(f"   ✅ No data to migrate for {table_name}")
        return 0
    
    # Check if table exists in Neon
    if not verify_table_exists(session_neon.bind, table_name):
        print(f"   ⚠️  Table {table_name} does not exist in Neon. Creating it...")
        Base.metadata.tables[table_name].create(bind=session_neon.bind)
    
    # Check existing count in Neon
    existing_count = get_table_count(session_neon, model_class)
    if existing_count > 0:
        if existing_count == count:
            print(f"   ✅ {table_name} already has {count} records (matches SQLite). Skipping...")
            return count
        else:
            print(f"   ⚠️  Warning: {table_name} has {existing_count} records in Neon, but SQLite has {count}")
            print(f"   ℹ️  Clearing existing data to perform fresh migration...")
            # Clear existing data for fresh migration
            session_neon.query(model_class).delete()
            session_neon.commit()
            print(f"   ✅ Cleared {existing_count} existing records")
    
    # Migrate records
    migrated = 0
    for i, record in enumerate(records, 1):
        try:
            # Create a new instance with the same data
            # Convert SQLAlchemy object to dict, then create new instance
            data = {}
            for column in model_class.__table__.columns:
                value = getattr(record, column.name)
                data[column.name] = value
            
            # Create new record in Neon
            new_record = model_class(**data)
            session_neon.add(new_record)
            
            migrated += 1
            if i % 100 == 0:
                print(f"   Progress: {i}/{count} records migrated...")
                session_neon.commit()  # Commit in batches
        except Exception as e:
            print(f"   ❌ Error migrating record {i} (ID: {getattr(record, 'id', 'N/A')}): {e}")
            session_neon.rollback()
            continue
    
    # Final commit
    try:
        session_neon.commit()
        print(f"   ✅ Successfully migrated {migrated}/{count} records to {table_name}")
        return migrated
    except Exception as e:
        print(f"   ❌ Error committing {table_name}: {e}")
        session_neon.rollback()
        return 0

def verify_migration(session_sqlite, session_neon):
    """Verify that all data was migrated correctly"""
    print("\n🔍 Verifying migration...")
    
    tables = [
        (Upload, "uploads"),
        (RawData, "raw_data"),
        (Calculation, "calculations"),
        (Summary, "summaries"),
        (TruckPerformance, "truck_performance"),
        (FarmPerformance, "farm_performance"),
        (ProcessingHistory, "processing_history"),
        (OverallSummary, "overall_summary"),
        (HistoricalTrend, "historical_trends"),
    ]
    
    all_match = True
    for model_class, table_name in tables:
        sqlite_count = get_table_count(session_sqlite, model_class)
        neon_count = get_table_count(session_neon, model_class)
        
        status = "✅" if sqlite_count == neon_count else "❌"
        print(f"   {status} {table_name}: SQLite={sqlite_count}, Neon={neon_count}")
        
        if sqlite_count != neon_count:
            all_match = False
    
    return all_match

def main():
    """Main migration function"""
    print("=" * 60)
    print("SQLite to Neon Database Migration")
    print("=" * 60)
    
    # Check if DATABASE_URL is set
    if not os.getenv("DATABASE_URL"):
        print("\n❌ ERROR: DATABASE_URL environment variable is not set!")
        print("\nPlease set it to your Neon database connection string:")
        print("  export DATABASE_URL='postgresql://user:password@host:port/database?sslmode=require'")
        print("\nOr on Windows:")
        print("  set DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require")
        sys.exit(1)
    
    # Create engines
    print("\n🔌 Connecting to databases...")
    try:
        sqlite_engine = get_sqlite_engine()
        neon_engine = get_neon_engine()
        print("   ✅ Connected to SQLite database")
        print("   ✅ Connected to Neon database")
    except Exception as e:
        print(f"   ❌ Error connecting to databases: {e}")
        sys.exit(1)
    
    # Create sessions
    SessionSQLite = sessionmaker(bind=sqlite_engine)
    SessionNeon = sessionmaker(bind=neon_engine)
    
    session_sqlite = SessionSQLite()
    session_neon = SessionNeon()
    
    try:
        # Create all tables in Neon (if they don't exist)
        print("\n📋 Creating tables in Neon database...")
        Base.metadata.create_all(bind=neon_engine)
        print("   ✅ Tables created/verified")
        
        # Migrate data in correct order (respecting foreign keys)
        print("\n🚀 Starting data migration...")
        
        # 1. Uploads (no dependencies)
        migrate_table(session_sqlite, session_neon, Upload, "uploads", Upload.id)
        
        # 2. RawData (depends on uploads)
        migrate_table(session_sqlite, session_neon, RawData, "raw_data", RawData.id)
        
        # 3. Calculations (depends on uploads, raw_data)
        migrate_table(session_sqlite, session_neon, Calculation, "calculations", Calculation.id)
        
        # 4. Summaries (depends on uploads)
        migrate_table(session_sqlite, session_neon, Summary, "summaries", Summary.id)
        
        # 5. TruckPerformance (depends on uploads)
        migrate_table(session_sqlite, session_neon, TruckPerformance, "truck_performance", TruckPerformance.id)
        
        # 6. FarmPerformance (depends on uploads)
        migrate_table(session_sqlite, session_neon, FarmPerformance, "farm_performance", FarmPerformance.id)
        
        # 7. ProcessingHistory (depends on uploads)
        migrate_table(session_sqlite, session_neon, ProcessingHistory, "processing_history", ProcessingHistory.id)
        
        # 8. OverallSummary (depends on uploads)
        migrate_table(session_sqlite, session_neon, OverallSummary, "overall_summary", OverallSummary.id)
        
        # 9. HistoricalTrends (depends on uploads)
        migrate_table(session_sqlite, session_neon, HistoricalTrend, "historical_trends", HistoricalTrend.id)
        
        # Reset PostgreSQL sequences to prevent ID conflicts
        print("\n🔄 Resetting PostgreSQL sequences...")
        try:
            from sqlalchemy import text
            
            # Get all tables with sequences
            tables = [
                "uploads", "raw_data", "calculations", "summaries",
                "truck_performance", "farm_performance", "processing_history",
                "overall_summary", "historical_trends"
            ]
            
            for table in tables:
                try:
                    # Get max ID from the table
                    result = session_neon.execute(
                        text(f"SELECT COALESCE(MAX(id), 0) FROM {table}")
                    )
                    max_id = result.scalar() or 0
                    
                    if max_id > 0:
                        # Reset sequence to max_id + 1
                        session_neon.execute(
                            text(f"SELECT setval('{table}_id_seq', {max_id + 1}, false)")
                        )
                        print(f"   ✅ Reset sequence for {table} to {max_id + 1}")
                except Exception as e:
                    # Sequence might not exist yet, that's okay
                    print(f"   ⚠️  Warning: Could not reset sequence for {table}: {e}")
            
            session_neon.commit()
        except Exception as e:
            print(f"   ⚠️  Warning: Could not reset sequences: {e}")
            # This is not critical, so we continue
        
        # Verify migration
        all_match = verify_migration(session_sqlite, session_neon)
        
        print("\n" + "=" * 60)
        if all_match:
            print("✅ Migration completed successfully!")
            print("\nAll data has been migrated to Neon database.")
            print("You can now use your application with Neon by setting DATABASE_URL.")
        else:
            print("⚠️  Migration completed with warnings.")
            print("Please review the counts above and verify data integrity.")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        session_neon.rollback()
        sys.exit(1)
    finally:
        session_sqlite.close()
        session_neon.close()

if __name__ == "__main__":
    main()

