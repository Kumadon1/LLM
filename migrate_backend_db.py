#!/usr/bin/env python3
"""
Migrate the backend database specifically
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
        # Check if text_corpus table exists and has metadata column
        cursor.execute("""
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name='text_corpus'
        """)
        result = cursor.fetchone()
        
        if result and 'metadata' in result[0] and 'meta_data' not in result[0]:
            print("Migrating text_corpus table...")
            
            # Add word_count and char_count columns if they don't exist
            try:
                cursor.execute("ALTER TABLE text_corpus ADD COLUMN word_count INTEGER")
                print("  Added word_count column")
            except sqlite3.OperationalError:
                pass  # Column already exists
            
            try:
                cursor.execute("ALTER TABLE text_corpus ADD COLUMN char_count INTEGER")
                print("  Added char_count column")
            except sqlite3.OperationalError:
                pass  # Column already exists
            
            # Rename metadata to meta_data
            cursor.execute("""
                ALTER TABLE text_corpus 
                RENAME COLUMN metadata TO meta_data
            """)
            print("  Renamed metadata to meta_data")
        
        # Check if accuracy_metrics table exists and has metadata column
        cursor.execute("""
            SELECT sql FROM sqlite_master 
            WHERE type='table' AND name='accuracy_metrics'
        """)
        result = cursor.fetchone()
        
        if result and 'metadata' in result[0] and 'meta_data' not in result[0]:
            print("Migrating accuracy_metrics table...")
            cursor.execute("""
                ALTER TABLE accuracy_metrics 
                RENAME COLUMN metadata TO meta_data
            """)
            print("  Renamed metadata to meta_data")
        
        # Commit changes
        conn.commit()
        print("Backend database migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()
