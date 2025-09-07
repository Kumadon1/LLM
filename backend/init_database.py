#!/usr/bin/env python3
"""
Initialize all database tables for James LLM 1
This ensures all SQLAlchemy models are properly created
"""
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir.parent))

# Set database path
os.environ['DATABASE_PATH'] = str(backend_dir / 'james_llm.db')

def init_all_tables():
    """Initialize all database tables from all model definitions"""
    print("Initializing James LLM 1 database...")
    
    # Import the main models that define all tables
    from backend.db.models import (
        Base,
        NeuralConfig,
        TextCorpus,
        GenerationHistory,
        AccuracyMetric,
        MarkovNGram,
        NeuralCheckpoint,
        TrainingJob,
        DatabaseVersion
    )
    
    # Import the engine
    from backend.db.engine import get_db_engine
    
    # Get the engine instance
    engine = get_db_engine()
    
    # Create all tables
    print(f"Creating tables in: {os.environ['DATABASE_PATH']}")
    Base.metadata.create_all(bind=engine.engine)
    
    # List created tables
    from sqlalchemy import inspect
    inspector = inspect(engine.engine)
    tables = inspector.get_table_names()
    
    print(f"\nCreated/verified {len(tables)} tables:")
    for table in sorted(tables):
        print(f"  - {table}")
    
    # Also ensure the other Base tables from core/database.py
    try:
        from backend.core.database import init_db as init_core_db
        init_core_db()
        print("\nAlso initialized core database tables (markov/neural models)")
    except Exception as e:
        print(f"Note: Could not initialize core tables: {e}")
    
    print("\nDatabase initialization complete!")
    
    # Verify critical tables exist
    critical_tables = [
        'neural_checkpoints',
        'markov_ngrams', 
        'text_corpus',
        'training_jobs',
        'neural_configs'
    ]
    
    missing = []
    for table in critical_tables:
        if table not in tables:
            missing.append(table)
    
    if missing:
        print(f"\nWARNING: Missing critical tables: {missing}")
        return False
    
    print("\nAll critical tables verified ✓")
    return True

if __name__ == "__main__":
    success = init_all_tables()
    sys.exit(0 if success else 1)
