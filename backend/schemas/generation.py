"""
Generation Schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


class GenerateRequest(BaseModel):
    """Text generation request"""
    prompt: str = Field("", description="Starting prompt for generation")
    temperature: float = Field(0.7, ge=0, le=2, description="Temperature for randomness")
    max_tokens: int = Field(100, ge=1, le=10000, description="Maximum tokens to generate")
    top_p: float = Field(0.9, ge=0, le=1, description="Top-p sampling parameter")
    model: Optional[str] = Field("default", description="Model to use for generation")
    
    class Config:
        schema_extra = {
            "example": {
                "prompt": "Once upon a time",
                "temperature": 0.7,
                "max_tokens": 100,
                "top_p": 0.9,
                "model": "default"
            }
        }


class GenerateResponse(BaseModel):
    """Text generation response"""
    generated_text: str
    valid_mask: Optional[List[bool]] = None


class GenerationHistoryItem(BaseModel):
    """Generation history item"""
    id: int
    prompt: str
    response: str
    model: Optional[str]
    parameters: Optional[Dict[str, Any]]
    created_at: datetime


class GenerationHistoryList(BaseModel):
    """List of generation history items"""
    history: List[GenerationHistoryItem]


class MonteCarloRequest(BaseModel):
    """Monte Carlo simulation request"""
    num_simulations: int = Field(..., ge=1, le=1000000)
    confidence_level: int = Field(..., ge=1, le=99)
    random_seed: int = Field(..., ge=0)
    distribution_type: str = Field(..., regex="^(Normal|Uniform|Exponential)$")
    mean: float
    std_dev: float = Field(..., gt=0)
    
    class Config:
        schema_extra = {
            "example": {
                "num_simulations": 10000,
                "confidence_level": 95,
                "random_seed": 42,
                "distribution_type": "Normal",
                "mean": 0.0,
                "std_dev": 1.0
            }
        }


class MonteCarloResponse(BaseModel):
    """Monte Carlo simulation response"""
    mean: float
    std: float
    min: float
    max: float
    percentiles: Dict[str, float]
    confidence_interval: List[float]


class AccuracyMetricInput(BaseModel):
    """Accuracy metric input"""
    metric_type: str = Field(..., min_length=1)
    value: float
    metadata: Optional[Dict[str, Any]] = None


class AccuracyMetric(BaseModel):
    """Accuracy metric with metadata"""
    id: int
    type: str
    value: float
    metadata: Optional[Dict[str, Any]]
    created_at: datetime


class AccuracyMetricsList(BaseModel):
    """List of accuracy metrics"""
    metrics: List[AccuracyMetric]
