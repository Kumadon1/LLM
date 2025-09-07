"""
Database initialization module
Ensures all tables are created with correct schemas
"""
import logging
from typing import Optional
from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)

def ensure_database_initialized() -> bool:
    """
    Ensure all database tables are created with correct schemas.
    This should be called on application startup.
    """
    try:
        # Import all models to register them with Base
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
        
        # Import engine
        from backend.db.engine import get_db_engine
        
        engine = get_db_engine()
        
        # Create all tables
        Base.metadata.create_all(bind=engine.engine, checkfirst=True)
        
        # Verify tables were created
        inspector = inspect(engine.engine)
        tables = inspector.get_table_names()
        
        logger.info(f"Database initialized with {len(tables)} tables")
        
        # Verify critical tables
        critical_tables = [
            'neural_checkpoints',
            'markov_ngrams',
            'text_corpus',
            'training_jobs',
            'neural_configs',
            'accuracy_metrics',
            'generation_history'
        ]
        
        missing = [t for t in critical_tables if t not in tables]
        if missing:
            logger.error(f"Missing critical tables: {missing}")
            return False
            
        # Also initialize the core database models (markov/neural from core/)
        try:
            from backend.core.database import init_db as init_core_db
            init_core_db()
            logger.info("Core database models initialized")
        except Exception as e:
            logger.warning(f"Could not initialize core models: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False

def check_database_health() -> dict:
    """
    Check database health and return status
    """
    try:
        from backend.db.engine import get_db_engine
        
        engine = get_db_engine()
        
        # Test connection
        with engine.engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        # Get table count
        inspector = inspect(engine.engine)
        tables = inspector.get_table_names()
        
        # Get pool status
        pool_status = engine.get_pool_status()
        
        return {
            "status": "healthy",
            "tables": len(tables),
            "pool": pool_status,
            "database_url": engine.config.database_url.split('@')[0]
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }
