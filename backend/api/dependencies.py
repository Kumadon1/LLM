"""
API Dependencies
Shared dependencies for FastAPI routes
"""
from typing import Generator
from backend.db.repository import DatabaseRepository, get_repository


def get_db() -> Generator[DatabaseRepository, None, None]:
    """Dependency to get database repository"""
    db = get_repository()
    try:
        yield db
    finally:
        pass  # Repository handles its own cleanup
