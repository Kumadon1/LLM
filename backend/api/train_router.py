"""FastAPI router for training jobs."""
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from backend.services.job_runner import launch_job, get_job

router = APIRouter()

class TrainRequest(BaseModel):
    text: str = Field(..., min_length=1)
    block_size: int = 100_000
    epochs: int = 5

class TrainResponse(BaseModel):
    job_id: str

class ProgressResponse(BaseModel):
    progress: int
    message: str

@router.post("/train", response_model=TrainResponse)
async def start_training(req: TrainRequest):
    job_id = launch_job(req.text, req.block_size, req.epochs)
    return {"job_id": job_id}

@router.get("/train/{job_id}", response_model=ProgressResponse)
async def get_progress(job_id: str):
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

