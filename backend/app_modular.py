"""
James LLM 1 - Modular Backend
Refactored FastAPI backend with proper separation of concerns
"""
import os
import sys
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import routers
from backend.api.routes import training, generation, neural, models

# Configuration from environment
PORT = int(os.getenv('PORT', 8000))
DATABASE_PATH = os.getenv('DATABASE_PATH', 'james_llm.db')
MODELS_PATH = os.getenv('MODELS_PATH', 'models')
CACHE_PATH = os.getenv('CACHE_PATH', 'cache')

# Create necessary directories
Path(MODELS_PATH).mkdir(parents=True, exist_ok=True)
Path(CACHE_PATH).mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(
    title="James LLM 1 Backend",
    version="1.0.0",
    description="Modular backend for James LLM text generation system",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "file://"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(training.router)
app.include_router(generation.router)
app.include_router(neural.router)
app.include_router(models.router)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and services on startup"""
    from backend.db.repository import get_repository
    from backend.core.database import init_db as init_sqlalchemy
    
    # Initialize repository (creates tables if needed)
    repository = get_repository()
    
    # Initialize SQLAlchemy tables for Markov/Neural
    try:
        init_sqlalchemy()
    except Exception as e:
        print(f"Warning: SQLAlchemy init failed: {e}")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "James LLM 1 Backend",
        "status": "operational",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health"
        }
    }


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    from backend.db.repository import get_repository
    
    try:
        # Test database connection
        repository = get_repository()
        stats = repository.get_data_stats()
        db_status = "connected"
    except Exception:
        db_status = "error"
        stats = {}
    
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "models_path": MODELS_PATH,
        "cache_path": CACHE_PATH,
        "stats": stats
    }


if __name__ == "__main__":
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=PORT, 
        log_level="info",
        reload=True  # Enable auto-reload during development
    )
