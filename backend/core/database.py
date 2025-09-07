"""Database utilities and initialization for James LLM backend.
Currently uses synchronous SQLAlchemy with SQLite file backend.  
If you later migrate to async SQLModel or PostgreSQL you can refactor here only.
"""
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

# ---------------------------------------------------------------------------
# Database path
# ---------------------------------------------------------------------------
_DB_DIR = Path(__file__).resolve().parent.parent
DB_FILE = _DB_DIR / "james_llm.db"

engine = create_engine(f"sqlite:///{DB_FILE}", echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()

# ---------------------------------------------------------------------------
# Initialization helper
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create all tables and required indices if they do not yet exist."""
    logger = logging.getLogger(__name__)
    # Import models so they register with Base before create_all
    import backend.models.markov  # noqa: F401
    import backend.models.neural  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # Ensure a UNIQUE index exists on (n, context, next_char) for SQLite ON CONFLICT
    with engine.begin() as conn:
        try:
            conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_markov_key ON markov_ngrams (n, context, next_char)"
            )
        except Exception as e:
            logger.exception("Failed to ensure unique index for markov_ngrams: %s", e)

