"""
Monte Carlo Evaluation API Router
Provides endpoints for retrieving evaluation history and results
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from backend.services.evaluation_service import MonteCarloEvaluationService
from backend.db.repository_orm import get_repository

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/evaluations")
async def get_evaluation_history(
    limit: int = Query(default=20, description="Maximum number of evaluations to return"),
    checkpoint_id: Optional[int] = Query(default=None, description="Filter by checkpoint ID")
) -> Dict[str, Any]:
    """
    Get Monte Carlo evaluation history
    
    Returns the most recent evaluation results, optionally filtered by checkpoint.
    """
    try:
        service = MonteCarloEvaluationService()
        evaluations = service.get_evaluation_history(limit=limit, checkpoint_id=checkpoint_id)
        
        return {
            "success": True,
            "evaluations": evaluations,
            "count": len(evaluations)
        }
    except Exception as e:
        logger.error(f"Failed to get evaluation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluations/{evaluation_id}")
async def get_evaluation_detail(evaluation_id: int) -> Dict[str, Any]:
    """
    Get detailed results for a specific Monte Carlo evaluation
    
    Returns full evaluation data including histogram and all samples.
    """
    try:
        repo = get_repository()
        evaluation = repo.get_monte_carlo_evaluation(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        return {
            "success": True,
            "evaluation": {
                "id": evaluation.id,
                "checkpoint_id": evaluation.checkpoint_id,
                "num_samples": evaluation.num_samples,
                "mean_validity": evaluation.mean_validity,
                "std_validity": evaluation.std_validity,
                "min_validity": evaluation.min_validity,
                "max_validity": evaluation.max_validity,
                "histogram": evaluation.histogram,
                "results": evaluation.results,
                "parameters": evaluation.parameters,
                "created_at": evaluation.created_at.isoformat() if evaluation.created_at else None
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get evaluation detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluations/progress/chart")
async def get_evaluation_progress_chart(
    limit: int = Query(default=10, description="Number of evaluations to include")
) -> Dict[str, Any]:
    """
    Get evaluation progress over time for charting
    
    Returns data formatted for displaying progress charts.
    """
    try:
        service = MonteCarloEvaluationService()
        chart_data = service.get_progress_chart_data(limit=limit)
        
        return {
            "success": True,
            "chart_data": chart_data
        }
    except Exception as e:
        logger.error(f"Failed to get progress chart: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluations/run")
async def run_evaluation(
    num_samples: int = Query(default=100, description="Number of samples to generate"),
    max_length: int = Query(default=200, description="Maximum length of generated text"),
    temperature: float = Query(default=0.8, description="Temperature for generation"),
    neural_weight: float = Query(default=0.5, description="Weight for neural model"),
    markov_weight: float = Query(default=0.5, description="Weight for Markov model")
) -> Dict[str, Any]:
    """
    Run a new Monte Carlo evaluation
    
    Generates samples and evaluates their validity.
    """
    try:
        service = MonteCarloEvaluationService()
        
        # Get the current best checkpoint
        repo = get_repository()
        best_checkpoint = repo.get_best_checkpoint()
        checkpoint_id = best_checkpoint.id if best_checkpoint else None
        
        result = service.run_evaluation(
            num_samples=num_samples,
            max_length=max_length,
            temperature=temperature,
            neural_weight=neural_weight,
            markov_weight=markov_weight,
            checkpoint_id=checkpoint_id
        )
        
        return {
            "success": True,
            "evaluation": result
        }
    except Exception as e:
        logger.error(f"Failed to run evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluations/latest")
async def get_latest_evaluation() -> Dict[str, Any]:
    """
    Get the most recent Monte Carlo evaluation result
    
    Returns the latest evaluation with summary statistics.
    """
    try:
        service = MonteCarloEvaluationService()
        evaluations = service.get_evaluation_history(limit=1)
        
        if not evaluations:
            return {
                "success": True,
                "evaluation": None,
                "message": "No evaluations found"
            }
        
        latest = evaluations[0]
        return {
            "success": True,
            "evaluation": latest
        }
    except Exception as e:
        logger.error(f"Failed to get latest evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
