"""
Database Repository
Centralized database operations with proper connection management
"""
import sqlite3
import json
import os
from contextlib import contextmanager
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path


class DatabaseRepository:
    """Repository pattern for database operations"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or os.getenv('DATABASE_PATH', 'james_llm.db')
        self._ensure_database()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _ensure_database(self):
        """Ensure database and tables exist"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Neural configurations table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS neural_configs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    config JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Text corpus table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS text_corpus (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    content TEXT NOT NULL,
                    source TEXT,
                    metadata JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Generation history table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS generation_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    prompt TEXT NOT NULL,
                    response TEXT NOT NULL,
                    model TEXT,
                    parameters JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Accuracy metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS accuracy_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    metadata JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
    
    # Neural Config Operations
    def save_neural_config(self, name: str, config: Dict) -> int:
        """Save a neural configuration"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO neural_configs (name, config) VALUES (?, ?)",
                (name, json.dumps(config))
            )
            return cursor.lastrowid
    
    def get_neural_configs(self) -> List[Dict]:
        """Get all neural configurations"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM neural_configs ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "config": json.loads(row["config"]),
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"]
                }
                for row in rows
            ]
    
    def delete_neural_config(self, config_id: int) -> bool:
        """Delete a neural configuration"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM neural_configs WHERE id = ?", (config_id,))
            return cursor.rowcount > 0
    
    # Text Corpus Operations
    def add_text(self, content: str, title: Optional[str] = None, 
                 source: Optional[str] = None, metadata: Optional[Dict] = None) -> int:
        """Add text to corpus"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO text_corpus (title, content, source, metadata) VALUES (?, ?, ?, ?)",
                (title, content, source, json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid
    
    def get_texts(self, limit: int = 100) -> List[Dict]:
        """Get texts from corpus"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM text_corpus ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "content": row["content"],
                    "source": row["source"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
                    "created_at": row["created_at"]
                }
                for row in rows
            ]
    
    def delete_text(self, text_id: int) -> bool:
        """Delete text from corpus"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM text_corpus WHERE id = ?", (text_id,))
            return cursor.rowcount > 0
    
    def get_corpus_count(self) -> int:
        """Get total number of documents in corpus"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM text_corpus")
            return cursor.fetchone()[0]
    
    # Generation History Operations
    def save_generation(self, prompt: str, response: str, 
                       model: Optional[str] = None, parameters: Optional[Dict] = None) -> int:
        """Save generation to history"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO generation_history (prompt, response, model, parameters) VALUES (?, ?, ?, ?)",
                (prompt, response, model, json.dumps(parameters) if parameters else None)
            )
            return cursor.lastrowid
    
    def get_generation_history(self, limit: int = 50) -> List[Dict]:
        """Get generation history"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM generation_history ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "prompt": row["prompt"],
                    "response": row["response"],
                    "model": row["model"],
                    "parameters": json.loads(row["parameters"]) if row["parameters"] else None,
                    "created_at": row["created_at"]
                }
                for row in rows
            ]
    
    def clear_generation_history(self) -> int:
        """Clear all generation history"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM generation_history")
            return cursor.rowcount
    
    # Accuracy Metrics Operations
    def record_accuracy(self, metric_type: str, value: float, metadata: Optional[Dict] = None) -> int:
        """Record an accuracy metric"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO accuracy_metrics (metric_type, value, metadata) VALUES (?, ?, ?)",
                (metric_type, value, json.dumps(metadata) if metadata else None)
            )
            return cursor.lastrowid
    
    def get_accuracy_metrics(self, limit: int = 100) -> List[Dict]:
        """Get accuracy metrics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(f"SELECT * FROM accuracy_metrics ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "type": row["metric_type"],
                    "value": row["value"],
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
                    "created_at": row["created_at"]
                }
                for row in rows
            ]
    
    # Statistics Operations
    def get_data_stats(self) -> Dict:
        """Get overall data statistics"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get counts
            cursor.execute("SELECT COUNT(*) FROM text_corpus")
            text_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM generation_history")
            generation_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT AVG(LENGTH(content)) FROM text_corpus")
            avg_length = cursor.fetchone()[0] or 0
            
            # Get storage size (approximate)
            db_size = Path(self.db_path).stat().st_size / (1024 * 1024) if Path(self.db_path).exists() else 0
            
            return {
                "total_texts": text_count,
                "total_generations": generation_count,
                "average_text_length": round(avg_length),
                "models_available": 3,  # Placeholder
                "storage_used_mb": round(db_size, 2)
            }


# Singleton instance
_repository_instance = None

def get_repository() -> DatabaseRepository:
    """Get or create repository instance"""
    global _repository_instance
    if _repository_instance is None:
        _repository_instance = DatabaseRepository()
    return _repository_instance
