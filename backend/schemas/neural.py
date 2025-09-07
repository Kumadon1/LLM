"""
Neural Configuration Schemas
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime


class NeuralConfig(BaseModel):
    """Neural network configuration"""
    model_type: str = Field(..., description="Type of model (e.g., CharRNN)")
    hidden_size: int = Field(..., ge=32, le=2048, description="Hidden layer size")
    num_layers: int = Field(..., ge=1, le=10, description="Number of layers")
    num_heads: int = Field(..., ge=1, le=32, description="Number of attention heads")
    learning_rate: float = Field(..., gt=0, le=1, description="Learning rate")
    batch_size: int = Field(..., ge=1, le=512, description="Batch size")
    epochs: int = Field(..., ge=1, le=100, description="Number of epochs")
    dropout: float = Field(..., ge=0, le=0.9, description="Dropout rate")
    
    @validator('hidden_size')
    def validate_hidden_size_divisible_by_heads(cls, v, values):
        """Ensure hidden_size is divisible by num_heads for attention"""
        if 'num_heads' in values and v % values['num_heads'] != 0:
            raise ValueError('hidden_size must be divisible by num_heads')
        return v

    class Config:
        schema_extra = {
            "example": {
                "model_type": "CharRNN",
                "hidden_size": 256,
                "num_layers": 3,
                "num_heads": 8,
                "learning_rate": 0.001,
                "batch_size": 32,
                "epochs": 10,
                "dropout": 0.2
            }
        }


class NeuralConfigResponse(BaseModel):
    """Response for neural configuration creation"""
    id: int
    message: str


class SavedNeuralConfig(BaseModel):
    """Saved neural configuration with metadata"""
    id: int
    name: str
    config: Dict[str, Any]
    created_at: datetime
    updated_at: datetime


class NeuralConfigList(BaseModel):
    """List of neural configurations"""
    configs: list[SavedNeuralConfig]
