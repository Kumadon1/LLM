"""
Database Migration System
Handles database schema evolution and data migrations
"""
import os
import logging
from typing import List, Callable, Dict, Any
from datetime import datetime
from sqlalchemy import text
from backend.db.engine import get_db_engine, db_session_scope
from backend.db.models import Base, DatabaseVersion

logger = logging.getLogger(__name__)


class Migration:
    """Represents a database migration"""
    
    def __init__(self, version: str, description: str, up: Callable, down: Callable = None):
        self.version = version
        self.description = description
        self.up = up
        self.down = down
    
    def apply(self):
        """Apply the migration"""
        logger.info(f"Applying migration {self.version}: {self.description}")
        self.up()
    
    def rollback(self):
        """Rollback the migration"""
        if self.down:
            logger.info(f"Rolling back migration {self.version}")
            self.down()
        else:
            logger.warning(f"No rollback defined for migration {self.version}")


class MigrationRunner:
    """Manages and runs database migrations"""
    
    def __init__(self):
        self.engine = get_db_engine()
        self.migrations = []
        self._register_migrations()
    
    def _register_migrations(self):
        """Register all migrations in order"""
        
        # Migration 001: Initial schema
        def migration_001_up():
            Base.metadata.create_all(bind=self.engine.engine)
            self._set_version("001", "Initial schema creation")
        
        def migration_001_down():
            Base.metadata.drop_all(bind=self.engine.engine)
        
        self.migrations.append(Migration(
            "001",
            "Initial schema creation",
            migration_001_up,
            migration_001_down
        ))
        
        # Migration 002: Add indexes for performance
        def migration_002_up():
            with self.engine.engine.connect() as conn:
                # Add composite indexes for better query performance
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_training_jobs_config_status 
                    ON training_jobs(neural_config_id, status)
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_markov_ngrams_n_count 
                    ON markov_ngrams(n, count DESC)
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_generation_history_quality 
                    ON generation_history(quality_score DESC)
                """))
                conn.commit()
            self._set_version("002", "Add performance indexes")
        
        def migration_002_down():
            with self.engine.engine.connect() as conn:
                conn.execute(text("DROP INDEX IF EXISTS idx_training_jobs_config_status"))
                conn.execute(text("DROP INDEX IF EXISTS idx_markov_ngrams_n_count"))
                conn.execute(text("DROP INDEX IF EXISTS idx_generation_history_quality"))
                conn.commit()
        
        self.migrations.append(Migration(
            "002",
            "Add performance indexes",
            migration_002_up,
            migration_002_down
        ))
        
        # Migration 003: Add full-text search for corpus (SQLite specific)
        def migration_003_up():
            if 'sqlite' in str(self.engine.engine.url):
                with self.engine.engine.connect() as conn:
                    # Create FTS virtual table for full-text search
                    conn.execute(text("""
                        CREATE VIRTUAL TABLE IF NOT EXISTS text_corpus_fts 
                        USING fts5(
                            corpus_id UNINDEXED,
                            title,
                            content,
                            source
                        )
                    """))
                    
                    # Populate FTS table from existing data
                    conn.execute(text("""
                        INSERT OR IGNORE INTO text_corpus_fts(corpus_id, title, content, source)
                        SELECT id, title, content, source FROM text_corpus
                    """))
                    
                    # Create triggers to keep FTS in sync
                    conn.execute(text("""
                        CREATE TRIGGER IF NOT EXISTS text_corpus_ai 
                        AFTER INSERT ON text_corpus 
                        BEGIN
                            INSERT INTO text_corpus_fts(corpus_id, title, content, source)
                            VALUES (new.id, new.title, new.content, new.source);
                        END
                    """))
                    
                    conn.execute(text("""
                        CREATE TRIGGER IF NOT EXISTS text_corpus_ad 
                        AFTER DELETE ON text_corpus 
                        BEGIN
                            DELETE FROM text_corpus_fts WHERE corpus_id = old.id;
                        END
                    """))
                    
                    conn.execute(text("""
                        CREATE TRIGGER IF NOT EXISTS text_corpus_au 
                        AFTER UPDATE ON text_corpus 
                        BEGIN
                            UPDATE text_corpus_fts 
                            SET title = new.title, content = new.content, source = new.source
                            WHERE corpus_id = new.id;
                        END
                    """))
                    conn.commit()
            
            self._set_version("003", "Add full-text search for corpus")
        
        def migration_003_down():
            if 'sqlite' in str(self.engine.engine.url):
                with self.engine.engine.connect() as conn:
                    conn.execute(text("DROP TRIGGER IF EXISTS text_corpus_ai"))
                    conn.execute(text("DROP TRIGGER IF EXISTS text_corpus_ad"))
                    conn.execute(text("DROP TRIGGER IF EXISTS text_corpus_au"))
                    conn.execute(text("DROP TABLE IF EXISTS text_corpus_fts"))
                    conn.commit()
        
        self.migrations.append(Migration(
            "003",
            "Add full-text search for corpus",
            migration_003_up,
            migration_003_down
        ))
    
    def _get_current_version(self) -> str:
        """Get the current database version"""
        try:
            with db_session_scope() as session:
                version = session.query(DatabaseVersion)\
                    .order_by(DatabaseVersion.applied_at.desc())\
                    .first()
                return version.version if version else "000"
        except Exception:
            # Table might not exist yet
            return "000"
    
    def _set_version(self, version: str, description: str):
        """Set the database version"""
        with db_session_scope() as session:
            db_version = DatabaseVersion(
                version=version,
                description=description
            )
            session.add(db_version)
    
    def get_pending_migrations(self) -> List[Migration]:
        """Get list of pending migrations"""
        current_version = self._get_current_version()
        pending = []
        
        for migration in self.migrations:
            if migration.version > current_version:
                pending.append(migration)
        
        return pending
    
    def migrate(self, target_version: str = None):
        """Run migrations up to target version"""
        current_version = self._get_current_version()
        
        logger.info(f"Current database version: {current_version}")
        
        if target_version is None:
            # Migrate to latest
            target_version = self.migrations[-1].version if self.migrations else current_version
        
        if target_version <= current_version:
            logger.info(f"Database is already at version {current_version}")
            return
        
        for migration in self.migrations:
            if current_version < migration.version <= target_version:
                try:
                    migration.apply()
                    logger.info(f"Successfully applied migration {migration.version}")
                except Exception as e:
                    logger.error(f"Failed to apply migration {migration.version}: {e}")
                    raise
        
        logger.info(f"Database migrated to version {target_version}")
    
    def rollback(self, target_version: str):
        """Rollback migrations to target version"""
        current_version = self._get_current_version()
        
        if target_version >= current_version:
            logger.info(f"Cannot rollback to version {target_version} from {current_version}")
            return
        
        # Apply rollbacks in reverse order
        for migration in reversed(self.migrations):
            if target_version < migration.version <= current_version:
                try:
                    migration.rollback()
                    # Remove version record
                    with db_session_scope() as session:
                        version_record = session.query(DatabaseVersion)\
                            .filter_by(version=migration.version)\
                            .first()
                        if version_record:
                            session.delete(version_record)
                    
                    logger.info(f"Successfully rolled back migration {migration.version}")
                except Exception as e:
                    logger.error(f"Failed to rollback migration {migration.version}: {e}")
                    raise
        
        logger.info(f"Database rolled back to version {target_version}")
    
    def status(self) -> Dict[str, Any]:
        """Get migration status"""
        current_version = self._get_current_version()
        pending = self.get_pending_migrations()
        
        return {
            'current_version': current_version,
            'latest_version': self.migrations[-1].version if self.migrations else "000",
            'pending_migrations': [
                {
                    'version': m.version,
                    'description': m.description
                }
                for m in pending
            ],
            'applied_migrations': [
                {
                    'version': m.version,
                    'description': m.description
                }
                for m in self.migrations
                if m.version <= current_version
            ]
        }


def run_migrations():
    """Convenience function to run all pending migrations"""
    runner = MigrationRunner()
    runner.migrate()
    return runner.status()


def get_migration_status():
    """Get current migration status"""
    runner = MigrationRunner()
    return runner.status()


def rollback_to_version(version: str):
    """Rollback to a specific version"""
    runner = MigrationRunner()
    runner.rollback(version)
    return runner.status()
