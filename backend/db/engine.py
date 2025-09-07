"""
Database Engine and Session Management
Enhanced database connection with pooling and optimizations
"""
import os
from contextlib import contextmanager
from typing import Generator, Optional
from sqlalchemy import create_engine, event, Engine, pool
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import QueuePool, NullPool
import logging

from backend.db.models import Base

logger = logging.getLogger(__name__)


class DatabaseConfig:
    """Database configuration"""
    
    def __init__(self):
        self.database_url = self._get_database_url()
        self.pool_size = int(os.getenv('DB_POOL_SIZE', '10'))
        self.max_overflow = int(os.getenv('DB_MAX_OVERFLOW', '20'))
        self.pool_timeout = int(os.getenv('DB_POOL_TIMEOUT', '30'))
        self.pool_recycle = int(os.getenv('DB_POOL_RECYCLE', '3600'))
        self.echo = os.getenv('DB_ECHO', 'false').lower() == 'true'
        self.use_pool = os.getenv('DB_USE_POOL', 'true').lower() == 'true'
    
    def _get_database_url(self) -> str:
        """Get database URL from environment or default"""
        db_type = os.getenv('DB_TYPE', 'sqlite')
        
        if db_type == 'postgresql':
            # PostgreSQL connection
            host = os.getenv('DB_HOST', 'localhost')
            port = os.getenv('DB_PORT', '5432')
            user = os.getenv('DB_USER', 'james_llm')
            password = os.getenv('DB_PASSWORD', 'password')
            database = os.getenv('DB_NAME', 'james_llm')
            return f"postgresql://{user}:{password}@{host}:{port}/{database}"
        
        elif db_type == 'mysql':
            # MySQL connection
            host = os.getenv('DB_HOST', 'localhost')
            port = os.getenv('DB_PORT', '3306')
            user = os.getenv('DB_USER', 'james_llm')
            password = os.getenv('DB_PASSWORD', 'password')
            database = os.getenv('DB_NAME', 'james_llm')
            return f"mysql+pymysql://{user}:{password}@{host}:{port}/{database}"
        
        else:
            # SQLite connection (default)
            db_path = os.getenv('DATABASE_PATH', 'james_llm.db')
            return f"sqlite:///{db_path}"


class DatabaseEngine:
    """Enhanced database engine with connection pooling"""
    
    _instance: Optional['DatabaseEngine'] = None
    _engine: Optional[Engine] = None
    _session_factory: Optional[sessionmaker] = None
    _scoped_session: Optional[scoped_session] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._engine is None:
            self.config = DatabaseConfig()
            self._initialize_engine()
            self._initialize_session_factory()
            self._setup_listeners()
    
    def _initialize_engine(self):
        """Initialize SQLAlchemy engine with pooling"""
        
        # Determine pooling strategy
        if 'sqlite' in self.config.database_url:
            # SQLite doesn't benefit from connection pooling
            poolclass = NullPool
            connect_args = {"check_same_thread": False}
            pool_kwargs = {}
        else:
            # Use QueuePool for other databases
            poolclass = QueuePool if self.config.use_pool else NullPool
            connect_args = {}
            pool_kwargs = {
                'pool_size': self.config.pool_size,
                'max_overflow': self.config.max_overflow,
                'pool_timeout': self.config.pool_timeout,
                'pool_recycle': self.config.pool_recycle,
                'pool_pre_ping': True,  # Verify connections before using
            } if self.config.use_pool else {}
        
        self._engine = create_engine(
            self.config.database_url,
            echo=self.config.echo,
            poolclass=poolclass,
            connect_args=connect_args,
            **pool_kwargs
        )
        
        logger.info(f"Database engine initialized: {self.config.database_url.split('@')[0]}")
    
    def _initialize_session_factory(self):
        """Initialize session factory"""
        self._session_factory = sessionmaker(
            bind=self._engine,
            autoflush=False,
            autocommit=False,
            expire_on_commit=False
        )
        self._scoped_session = scoped_session(self._session_factory)
    
    def _setup_listeners(self):
        """Setup SQLAlchemy event listeners for optimization"""
        
        # SQLite specific optimizations
        if 'sqlite' in self.config.database_url:
            @event.listens_for(self._engine, "connect")
            def set_sqlite_pragma(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                # Enable foreign keys
                cursor.execute("PRAGMA foreign_keys=ON")
                # Optimize for performance
                cursor.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
                cursor.execute("PRAGMA synchronous=NORMAL")  # Faster writes
                cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
                cursor.execute("PRAGMA temp_store=MEMORY")  # Use memory for temp tables
                cursor.close()
    
    @property
    def engine(self) -> Engine:
        """Get the database engine"""
        if self._engine is None:
            raise RuntimeError("Database engine not initialized")
        return self._engine
    
    @property
    def session_factory(self) -> sessionmaker:
        """Get the session factory"""
        if self._session_factory is None:
            raise RuntimeError("Session factory not initialized")
        return self._session_factory
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self._scoped_session()
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope for database operations"""
        session = self.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def create_all(self):
        """Create all database tables"""
        Base.metadata.create_all(bind=self._engine)
        logger.info("Database tables created")
    
    def drop_all(self):
        """Drop all database tables"""
        Base.metadata.drop_all(bind=self._engine)
        logger.info("Database tables dropped")
    
    def dispose(self):
        """Dispose of the engine and connection pool"""
        if self._engine:
            self._engine.dispose()
            logger.info("Database engine disposed")
    
    def get_pool_status(self) -> dict:
        """Get connection pool status"""
        if self._engine and hasattr(self._engine.pool, 'status'):
            return {
                'size': self._engine.pool.size(),
                'checked_in': self._engine.pool.checkedin(),
                'checked_out': self._engine.pool.checkedout(),
                'overflow': self._engine.pool.overflow(),
                'total': self._engine.pool.size() + self._engine.pool.overflow()
            }
        return {}


# Global engine instance
_db_engine: Optional[DatabaseEngine] = None


def get_db_engine() -> DatabaseEngine:
    """Get or create the database engine instance"""
    global _db_engine
    if _db_engine is None:
        _db_engine = DatabaseEngine()
    return _db_engine


def get_db_session() -> Session:
    """Get a database session"""
    return get_db_engine().get_session()


@contextmanager
def db_session_scope() -> Generator[Session, None, None]:
    """Context manager for database sessions"""
    engine = get_db_engine()
    with engine.session_scope() as session:
        yield session


# Initialize engine on module import
def init_db():
    """Initialize the database"""
    engine = get_db_engine()
    engine.create_all()
    return engine
