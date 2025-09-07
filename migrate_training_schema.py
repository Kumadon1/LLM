#!/usr/bin/env python3
"""
Migrate the backend database to add missing tables and columns for training
"""

import sqlite3
import sys
from pathlib import Path

def migrate_database():
    """Run database migrations on backend/james_llm.db"""
    db_path = Path(__file__).parent / "backend" / "james_llm.db"
    
    if not db_path.exists():
        print(f"Database {db_path} does not exist.")
        return
    
    print(f"Migrating backend database: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Create training_jobs table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS training_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id VARCHAR(100) UNIQUE NOT NULL,
                status VARCHAR(50) NOT NULL,
                progress INTEGER DEFAULT 0,
                message TEXT,
                error TEXT,
                neural_config_id INTEGER,
                text_corpus_id INTEGER,
                started_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (neural_config_id) REFERENCES neural_configs(id),
                FOREIGN KEY (text_corpus_id) REFERENCES text_corpus(id)
            )
        """)
        print("  Created/verified training_jobs table")
        
        # Create indexes for training_jobs
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_jobs_job_id ON training_jobs(job_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_jobs_status ON training_jobs(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_training_jobs_created_at ON training_jobs(created_at)")
        
        # Add missing columns to neural_checkpoints table
        # First check which columns exist
        cursor.execute("PRAGMA table_info(neural_checkpoints)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        
        if 'loss' not in existing_columns:
            cursor.execute("ALTER TABLE neural_checkpoints ADD COLUMN loss REAL")
            print("  Added loss column to neural_checkpoints")
        
        if 'accuracy' not in existing_columns:
            cursor.execute("ALTER TABLE neural_checkpoints ADD COLUMN accuracy REAL")
            print("  Added accuracy column to neural_checkpoints")
        
        if 'is_best' not in existing_columns:
            cursor.execute("ALTER TABLE neural_checkpoints ADD COLUMN is_best BOOLEAN DEFAULT 0")
            print("  Added is_best column to neural_checkpoints")
        
        if 'training_job_id' not in existing_columns:
            cursor.execute("ALTER TABLE neural_checkpoints ADD COLUMN training_job_id INTEGER REFERENCES training_jobs(id)")
            print("  Added training_job_id column to neural_checkpoints")
        
        # Create indexes for neural_checkpoints
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_neural_checkpoints_created_at ON neural_checkpoints(created_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_neural_checkpoints_is_best ON neural_checkpoints(is_best)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_neural_checkpoints_training_job ON neural_checkpoints(training_job_id)")
        
        # Add missing columns to accuracy_metrics if needed
        cursor.execute("PRAGMA table_info(accuracy_metrics)")
        acc_columns = {row[1] for row in cursor.fetchall()}
        
        if 'model_checkpoint_id' not in acc_columns:
            cursor.execute("ALTER TABLE accuracy_metrics ADD COLUMN model_checkpoint_id INTEGER REFERENCES neural_checkpoints(id)")
            print("  Added model_checkpoint_id column to accuracy_metrics")
        
        # Create indexes for accuracy_metrics
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_accuracy_metrics_checkpoint ON accuracy_metrics(model_checkpoint_id)")
        
        # Create markov_ngrams table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS markov_ngrams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                n INTEGER NOT NULL,
                context VARCHAR(255) NOT NULL,
                next_char VARCHAR(1) NOT NULL,
                count INTEGER DEFAULT 1,
                probability REAL,
                UNIQUE(n, context, next_char)
            )
        """)
        print("  Created/verified markov_ngrams table")
        
        # Create indexes for markov_ngrams
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_markov_n ON markov_ngrams(n)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_markov_context ON markov_ngrams(context)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_markov_n_context ON markov_ngrams(n, context)")
        
        # Add missing columns to generation_history if needed
        cursor.execute("PRAGMA table_info(generation_history)")
        gen_columns = {row[1] for row in cursor.fetchall()}
        
        if 'quality_score' not in gen_columns:
            cursor.execute("ALTER TABLE generation_history ADD COLUMN quality_score REAL")
            print("  Added quality_score column to generation_history")
        
        if 'user_rating' not in gen_columns:
            cursor.execute("ALTER TABLE generation_history ADD COLUMN user_rating INTEGER")
            print("  Added user_rating column to generation_history")
        
        # Commit changes
        conn.commit()
        print("\nBackend database migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
