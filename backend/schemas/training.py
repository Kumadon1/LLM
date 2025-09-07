"""
Training Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class TrainRequest(BaseModel):
    """Training request parameters"""
    text: str = Field(..., min_length=100, description="Training text")
    block_size: int = Field(100000, ge=1000, le=1000000, description="Block size for processing")
    epochs: int = Field(5, ge=1, le=100, description="Number of training epochs")
    
    class Config:
        schema_extra = {
            "example": {
                "text": "Your training text here...",
                "block_size": 100000,
                "epochs": 5
            }
        }


class TrainResponse(BaseModel):
    """Training job response"""
    job_id: str


class TrainingProgress(BaseModel):
    """Training progress information"""
    progress: int = Field(..., ge=0, le=100)
    message: str
    status: str = Field(..., regex="^(queued|running|success|error)$")
    error: Optional[str] = None


class TextInput(BaseModel):
    """Text corpus input"""
    title: Optional[str] = None
    content: str = Field(..., min_length=1)
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class TextInputResponse(BaseModel):
    """Text input response"""
    id: int
    message: str


class TextCorpusItem(BaseModel):
    """Text corpus item with metadata"""
    id: int
    title: Optional[str]
    content: str
    source: Optional[str]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime


class TextCorpusList(BaseModel):
    """List of text corpus items"""
    texts: list[TextCorpusItem]


class DataStats(BaseModel):
    """Data statistics"""
    total_texts: int
    total_generations: int
    average_text_length: float
    models_available: int
    storage_used_mb: float


class CorpusIngestRequest(BaseModel):
    """Corpus ingestion request"""
    files: list[str] = Field(..., min_items=1)


class CorpusIngestResponse(BaseModel):
    """Corpus ingestion response"""
    message: str
    status: str


class CorpusStatus(BaseModel):
    """Corpus processing status"""
    total_documents: int
    processing: bool
    last_update: datetime
