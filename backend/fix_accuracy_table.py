#!/usr/bin/env python3
"""
Fix the accuracy_metrics table to include the model_checkpoint_id column
"""
import sys
import os
from pathlib import Path
import sqlite3

# Add backend to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir.parent))

# Set database path
db_path = backend_dir / 'james_llm.db'
os.environ['DATABASE_PATH'] = str(db_path)

def fix_accuracy_metrics_table():
    """Drop and recreate the accuracy_metrics table with correct schema"""
    print(f"Fixing accuracy_metrics table in: {db_path}")
    
    # First, let's backup any existing data
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if table exists and get existing data
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='accuracy_metrics'")
        table_exists = cursor.fetchone() is not None
        
        existing_data = []
        if table_exists:
            try:
                cursor.execute("SELECT * FROM accuracy_metrics")
                columns = [description[0] for description in cursor.description]
                existing_data = cursor.fetchall()
                print(f"Found {len(existing_data)} existing records in accuracy_metrics")
                print(f"Existing columns: {columns}")
            except Exception as e:
                print(f"Could not read existing data: {e}")
            
            # Drop the old table
            cursor.execute("DROP TABLE IF EXISTS accuracy_metrics")
            conn.commit()
            print("Dropped old accuracy_metrics table")
    
    except Exception as e:
        print(f"Error checking/dropping table: {e}")
    finally:
        conn.close()
    
    # Now recreate with correct schema using SQLAlchemy
    from backend.db.models import Base, AccuracyMetric
    from backend.db.engine import get_db_engine
    
    engine = get_db_engine()
    
    # Create just the accuracy_metrics table
    AccuracyMetric.__table__.create(bind=engine.engine, checkfirst=True)
    print("Created new accuracy_metrics table with correct schema")
    
    # Verify the new schema
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(accuracy_metrics)")
    columns = cursor.fetchall()
    print("\nNew table schema:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
    conn.close()
    
    return True

def verify_all_tables():
    """Verify all tables have correct schemas"""
    from backend.db.models import Base
    from backend.db.engine import get_db_engine
    from sqlalchemy import inspect
    
    engine = get_db_engine()
    inspector = inspect(engine.engine)
    
    # Get all table names from models
    model_tables = set(Base.metadata.tables.keys())
    
    # Get all tables in database
    db_tables = set(inspector.get_table_names())
    
    # Check for missing tables
    missing = model_tables - db_tables
    if missing:
        print(f"\nMissing tables: {missing}")
        print("Creating missing tables...")
        Base.metadata.create_all(bind=engine.engine, checkfirst=True)
        print("All tables created")
    else:
        print("\nAll model tables exist in database ✓")
    
    # Verify critical columns
    critical_checks = [
        ('accuracy_metrics', 'model_checkpoint_id'),
        ('neural_checkpoints', 'training_job_id'),
        ('training_jobs', 'neural_config_id'),
    ]
    
    for table, column in critical_checks:
        columns = [col['name'] for col in inspector.get_columns(table)]
        if column in columns:
            print(f"  ✓ {table}.{column} exists")
        else:
            print(f"  ✗ {table}.{column} MISSING - recreating table")
            # Recreate the table
            Base.metadata.tables[table].drop(engine.engine, checkfirst=True)
            Base.metadata.tables[table].create(engine.engine, checkfirst=True)
            print(f"    Recreated {table}")

if __name__ == "__main__":
    try:
        fix_accuracy_metrics_table()
        verify_all_tables()
        print("\nDatabase schema fixed successfully!")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
