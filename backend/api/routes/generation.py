"""
Generation Routes
Handles text generation and related API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
import random
import numpy as np
from datetime import datetime

from backend.schemas.generation import (
    GenerateRequest, GenerateResponse,
    GenerationHistoryItem, GenerationHistoryList,
    MonteCarloRequest, MonteCarloResponse,
    AccuracyMetricInput, AccuracyMetric, AccuracyMetricsList
)
from backend.api.dependencies import get_db
from backend.db.repository import DatabaseRepository
from backend.services.generation_service import generate_text
from backend.utils.word_validation import validate_text

router = APIRouter(prefix="/api", tags=["generation"])


@router.post("/generate", response_model=GenerateResponse)
async def generate_text_endpoint(
    request: GenerateRequest,
    db: DatabaseRepository = Depends(get_db)
) -> GenerateResponse:
    """Generate text using hybrid Markov-neural model"""
    
    # Generate text
    text = generate_text(
        n_chars=request.max_tokens,
        prompt=request.prompt,
        temperature=request.temperature,
        # Note: Individual Markov weights aren't exposed in current implementation
        # Using default weights from generation_service
    )
    
    # Validate words
    valid_mask = validate_text(text)
    
    # Save to history
    db.save_generation(
        prompt=request.prompt,
        response=text,
        model=request.model,
        parameters={
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "top_p": request.top_p
        }
    )
    
    return GenerateResponse(generated_text=text, valid_mask=valid_mask)


@router.get("/generate/history", response_model=GenerationHistoryList)
async def get_generation_history(
    limit: int = 50,
    db: DatabaseRepository = Depends(get_db)
) -> GenerationHistoryList:
    """Get generation history"""
    history = db.get_generation_history(limit)
    items = [
        GenerationHistoryItem(
            id=h["id"],
            prompt=h["prompt"],
            response=h["response"],
            model=h["model"],
            parameters=h["parameters"],
            created_at=datetime.fromisoformat(h["created_at"]) if isinstance(h["created_at"], str) else h["created_at"]
        )
        for h in history
    ]
    return GenerationHistoryList(history=items)


@router.delete("/generate/history")
async def clear_generation_history(db: DatabaseRepository = Depends(get_db)):
    """Clear all generation history"""
    count = db.clear_generation_history()
    return {"message": f"Cleared {count} generation entries"}


@router.post("/monte-carlo/run", response_model=MonteCarloResponse)
async def run_monte_carlo(request: MonteCarloRequest) -> MonteCarloResponse:
    """Run Monte Carlo simulation"""
    random.seed(request.random_seed)
    np.random.seed(request.random_seed)
    
    # Generate samples based on distribution type
    if request.distribution_type == "Normal":
        samples = np.random.normal(request.mean, request.std_dev, request.num_simulations)
    elif request.distribution_type == "Uniform":
        samples = np.random.uniform(
            request.mean - request.std_dev, 
            request.mean + request.std_dev, 
            request.num_simulations
        )
    else:  # Exponential
        samples = np.random.exponential(request.mean, request.num_simulations)
    
    # Calculate statistics
    return MonteCarloResponse(
        mean=float(np.mean(samples)),
        std=float(np.std(samples)),
        min=float(np.min(samples)),
        max=float(np.max(samples)),
        percentiles={
            "5": float(np.percentile(samples, 5)),
            "25": float(np.percentile(samples, 25)),
            "50": float(np.percentile(samples, 50)),
            "75": float(np.percentile(samples, 75)),
            "95": float(np.percentile(samples, 95))
        },
        confidence_interval=[
            float(np.percentile(samples, (100 - request.confidence_level) / 2)),
            float(np.percentile(samples, 100 - (100 - request.confidence_level) / 2))
        ]
    )


@router.post("/accuracy/record")
async def record_accuracy(
    metric: AccuracyMetricInput,
    db: DatabaseRepository = Depends(get_db)
):
    """Record an accuracy metric"""
    db.record_accuracy(
        metric_type=metric.metric_type,
        value=metric.value,
        metadata=metric.metadata
    )
    return {"message": "Metric recorded"}


@router.get("/accuracy/metrics", response_model=AccuracyMetricsList)
async def get_accuracy_metrics(
    db: DatabaseRepository = Depends(get_db)
) -> AccuracyMetricsList:
    """Get accuracy metrics"""
    metrics = db.get_accuracy_metrics()
    items = [
        AccuracyMetric(
            id=m["id"],
            type=m["type"],
            value=m["value"],
            metadata=m["metadata"],
            created_at=datetime.fromisoformat(m["created_at"]) if isinstance(m["created_at"], str) else m["created_at"]
        )
        for m in metrics
    ]
    return AccuracyMetricsList(metrics=items)
