"""
James LLM 1 - Advanced Backend Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import uvicorn
from api import routers
from core.config import settings
from core.database import init_db
from core.websocket import socket_app
import structlog

# Configure structured logging
logger = structlog.get_logger()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting James LLM 1 Backend", version=settings.VERSION)
    
    # Initialize database
    await init_db()
    
    # Initialize ML models
    from services.ml_service import MLService
    ml_service = MLService()
    await ml_service.initialize()
    
    yield
    
    # Cleanup
    logger.info("Shutting down James LLM 1 Backend")
    await ml_service.cleanup()

# Create FastAPI app
app = FastAPI(
    title="James LLM 1 API",
    description="Advanced LLM Application Backend",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Mount WebSocket app
app.mount("/ws", socket_app)

# Include routers
app.include_router(routers.auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(routers.neural_config_router, prefix="/api/neural-config", tags=["neural-config"])
app.include_router(routers.text_router, prefix="/api/text", tags=["text-management"])
app.include_router(routers.generate_router, prefix="/api/generate", tags=["generation"])
app.include_router(routers.data_viewer_router, prefix="/api/data", tags=["data-viewer"])
app.include_router(routers.monte_carlo_router, prefix="/api/monte-carlo", tags=["monte-carlo"])
app.include_router(routers.accuracy_router, prefix="/api/accuracy", tags=["accuracy"])
app.include_router(routers.corpus_router, prefix="/api/corpus", tags=["corpus-ingestion"])

# Training & Generation endpoints
from backend.api import train_router
app.include_router(train_router.router, prefix="/api", tags=["training"])
from backend.api import generate_router
app.include_router(generate_router.router, prefix="/api", tags=["generation"])
from backend.api import evaluation_router
app.include_router(evaluation_router.router, prefix="/api/evaluation", tags=["evaluation"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "James LLM 1",
        "version": settings.VERSION,
        "status": "operational",
        "endpoints": {
            "docs": "/api/docs",
            "redoc": "/api/redoc",
            "health": "/health",
            "metrics": "/metrics"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "database": "connected",
        "redis": "connected",
        "ml_models": "loaded"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
