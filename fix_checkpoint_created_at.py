#!/usr/bin/env python3
"""
Fix the created_at column in neural_checkpoints to have a default value
"""

import sqlite3
import sys
from pathlib import Path

def fix_created_at():
    """Fix created_at column to have default timestamp"""
    db_path = Path(__file__).parent / "backend" / "james_llm.db"
    
    if not db_path.exists():
        print(f"Database {db_path} does not exist.")
        return
    
    print(f"Fixing neural_checkpoints table in: {db_path}")
    
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # SQLite doesn't support ALTER COLUMN, so we need to recreate the table
        # First, backup the existing data
        cursor.execute("SELECT * FROM neural_checkpoints")
        existing_data = cursor.fetchall()
        
        # Drop the old table
        cursor.execute("DROP TABLE IF EXISTS neural_checkpoints")
        
        # Create the new table with proper defaults
        cursor.execute("""
            CREATE TABLE neural_checkpoints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                epochs INTEGER NOT NULL,
                block_size INTEGER NOT NULL,
                path VARCHAR(500) NOT NULL,
                notes TEXT,
                loss REAL,
                accuracy REAL,
                is_best BOOLEAN DEFAULT 0,
                training_job_id INTEGER,
                FOREIGN KEY (training_job_id) REFERENCES training_jobs(id)
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX idx_neural_checkpoints_created_at ON neural_checkpoints(created_at)")
        cursor.execute("CREATE INDEX idx_neural_checkpoints_is_best ON neural_checkpoints(is_best)")
        cursor.execute("CREATE INDEX idx_neural_checkpoints_training_job ON neural_checkpoints(training_job_id)")
        
        # Restore existing data if any
        if existing_data:
            for row in existing_data:
                # Adjust for new columns (add defaults for missing ones)
                if len(row) < 10:  # Old schema had fewer columns
                    row = list(row) + [None] * (10 - len(row))
                cursor.execute("""
                    INSERT INTO neural_checkpoints 
                    (id, created_at, epochs, block_size, path, notes, loss, accuracy, is_best, training_job_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, row)
        
        conn.commit()
        print("Successfully fixed neural_checkpoints table!")
        
    except Exception as e:
        print(f"Error during fix: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    fix_created_at()
