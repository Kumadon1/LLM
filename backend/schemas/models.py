"""
Model Management Schemas
"""
from pydantic import BaseModel, Field
from typing import List


class Model(BaseModel):
    """Model information"""
    name: str
    path: str
    size_mb: float


class ModelsList(BaseModel):
    """List of available models"""
    models: List[Model]


class ModelDownloadRequest(BaseModel):
    """Model download request"""
    model_name: str = Field(..., min_length=1)
    model_url: str = Field(..., regex="^https?://")


class ModelDownloadResponse(BaseModel):
    """Model download response"""
    message: str
    status: str
