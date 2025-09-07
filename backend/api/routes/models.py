"""
Model Management Routes
Handles model listing and management API endpoints
"""
from fastapi import APIRouter, HTTPException
from pathlib import Path
import os

from backend.schemas.models import (
    Model, ModelsList, 
    ModelDownloadRequest, ModelDownloadResponse
)

router = APIRouter(prefix="/api", tags=["models"])

# Get models path from environment or use default
MODELS_PATH = os.getenv('MODELS_PATH', 'models')


@router.get("/models", response_model=ModelsList)
async def list_models() -> ModelsList:
    """List available models"""
    models_dir = Path(MODELS_PATH)
    models = []
    
    if models_dir.exists():
        for model_path in models_dir.iterdir():
            if model_path.is_dir():
                # Calculate total size of all files in directory
                size_bytes = sum(f.stat().st_size for f in model_path.rglob('*') if f.is_file())
                models.append(Model(
                    name=model_path.name,
                    path=str(model_path),
                    size_mb=size_bytes / (1024 * 1024)
                ))
    
    return ModelsList(models=models)


@router.post("/models/download", response_model=ModelDownloadResponse)
async def download_model(request: ModelDownloadRequest) -> ModelDownloadResponse:
    """Download a model (placeholder implementation)"""
    # In production, this would actually download the model
    # For now, it's just a placeholder
    return ModelDownloadResponse(
        message=f"Downloading {request.model_name}",
        status="started"
    )


@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    """Delete a model"""
    models_dir = Path(MODELS_PATH)
    model_path = models_dir / model_name
    
    if not model_path.exists():
        raise HTTPException(status_code=404, detail="Model not found")
    
    if not model_path.is_dir():
        raise HTTPException(status_code=400, detail="Invalid model path")
    
    # In production, you'd want to be more careful about deletion
    # For now, we'll just return success without actually deleting
    return {"message": f"Model {model_name} marked for deletion"}
