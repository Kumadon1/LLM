"""
Training Routes
Handles training-related API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
import asyncio

from backend.schemas.training import (
    TrainRequest, TrainResponse, TrainingProgress,
    TextInput, TextInputResponse, TextCorpusItem, TextCorpusList,
    DataStats, CorpusIngestRequest, CorpusIngestResponse, CorpusStatus
)
from backend.api.dependencies import get_db
from backend.db.repository import DatabaseRepository
from backend.services.job_runner import launch_job, get_job
from backend.services.training_service import get_training_statistics
from datetime import datetime

router = APIRouter(prefix="/api", tags=["training"])


@router.post("/train", response_model=TrainResponse)
async def start_training(request: TrainRequest) -> TrainResponse:
    """Start a new training job"""
    job_id = launch_job(request.text, request.block_size, request.epochs)
    return TrainResponse(job_id=job_id)


@router.get("/train/{job_id}", response_model=TrainingProgress)
async def get_training_progress(job_id: str) -> TrainingProgress:
    """Get training job progress"""
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return TrainingProgress(
        progress=job.get("progress", 0),
        message=job.get("message", ""),
        status=job.get("status", "queued"),
        error=job.get("error")
    )


@router.post("/text", response_model=TextInputResponse)
async def add_text(
    text_input: TextInput,
    db: DatabaseRepository = Depends(get_db)
) -> TextInputResponse:
    """Add text to corpus"""
    text_id = db.add_text(
        content=text_input.content,
        title=text_input.title,
        source=text_input.source,
        metadata=text_input.metadata
    )
    return TextInputResponse(id=text_id, message="Text added successfully")


@router.get("/text", response_model=TextCorpusList)
async def get_texts(
    limit: int = 100,
    db: DatabaseRepository = Depends(get_db)
) -> TextCorpusList:
    """Get texts from corpus"""
    texts = db.get_texts(limit)
    items = [
        TextCorpusItem(
            id=t["id"],
            title=t["title"],
            content=t["content"],
            source=t["source"],
            metadata=t.get("metadata") or t.get("meta_data"),
            created_at=datetime.fromisoformat(t["created_at"]) if isinstance(t["created_at"], str) else t["created_at"]
        )
        for t in texts
    ]
    return TextCorpusList(texts=items)


@router.delete("/text/{text_id}")
async def delete_text(
    text_id: int,
    db: DatabaseRepository = Depends(get_db)
):
    """Delete text from corpus"""
    if not db.delete_text(text_id):
        raise HTTPException(status_code=404, detail="Text not found")
    return {"message": "Text deleted successfully"}


@router.get("/data/stats", response_model=DataStats)
async def get_data_stats(db: DatabaseRepository = Depends(get_db)) -> DataStats:
    """Get data statistics"""
    stats = db.get_data_stats()
    return DataStats(**stats)


@router.post("/corpus/ingest", response_model=CorpusIngestResponse)
async def ingest_corpus(
    request: CorpusIngestRequest,
    background_tasks: BackgroundTasks
) -> CorpusIngestResponse:
    """Ingest corpus files"""
    # In production, this would process files asynchronously
    background_tasks.add_task(process_corpus_files, request.files)
    return CorpusIngestResponse(
        message=f"Ingesting {len(request.files)} files",
        status="processing"
    )


async def process_corpus_files(files: List[str]):
    """Process corpus files (placeholder)"""
    await asyncio.sleep(2)  # Simulate processing
    print(f"Processed {len(files)} files")


@router.get("/corpus/status", response_model=CorpusStatus)
async def get_corpus_status(db: DatabaseRepository = Depends(get_db)) -> CorpusStatus:
    """Get corpus processing status"""
    count = db.get_corpus_count()
    return CorpusStatus(
        total_documents=count,
        processing=False,
        last_update=datetime.now()
    )


@router.get("/training/stats")
async def get_training_stats():
    """Get comprehensive training statistics"""
    stats = get_training_statistics()
    return stats
