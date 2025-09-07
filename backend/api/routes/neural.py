"""
Neural Configuration Routes
Handles neural network configuration API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

from backend.schemas.neural import (
    NeuralConfig, NeuralConfigResponse, 
    SavedNeuralConfig, NeuralConfigList
)
from backend.api.dependencies import get_db
from backend.db.repository import DatabaseRepository

router = APIRouter(prefix="/api", tags=["neural"])


@router.post("/neural-config", response_model=NeuralConfigResponse)
async def save_neural_config(
    config: NeuralConfig,
    db: DatabaseRepository = Depends(get_db)
) -> NeuralConfigResponse:
    """Save a neural network configuration"""
    config_id = db.save_neural_config(
        name=f"config_{datetime.now().isoformat()}",
        config=config.dict()
    )
    return NeuralConfigResponse(id=config_id, message="Configuration saved")


@router.get("/neural-config", response_model=NeuralConfigList)
async def get_neural_configs(
    db: DatabaseRepository = Depends(get_db)
) -> NeuralConfigList:
    """Get all saved neural configurations"""
    configs = db.get_neural_configs()
    items = [
        SavedNeuralConfig(
            id=c["id"],
            name=c["name"],
            config=c["config"],
            created_at=datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"],
            updated_at=datetime.fromisoformat(c["updated_at"]) if isinstance(c["updated_at"], str) else c["updated_at"]
        )
        for c in configs
    ]
    return NeuralConfigList(configs=items)


@router.delete("/neural-config/{config_id}")
async def delete_neural_config(
    config_id: int,
    db: DatabaseRepository = Depends(get_db)
):
    """Delete a neural configuration"""
    if not db.delete_neural_config(config_id):
        raise HTTPException(status_code=404, detail="Configuration not found")
    return {"message": "Configuration deleted"}


@router.put("/neural-config/{config_id}", response_model=NeuralConfigResponse)
async def update_neural_config(
    config_id: int,
    config: NeuralConfig,
    db: DatabaseRepository = Depends(get_db)
) -> NeuralConfigResponse:
    """Update a neural configuration"""
    # For simplicity, delete and recreate
    # In production, you'd implement a proper update method
    if not db.delete_neural_config(config_id):
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    new_id = db.save_neural_config(
        name=f"config_{datetime.now().isoformat()}",
        config=config.dict()
    )
    return NeuralConfigResponse(id=new_id, message="Configuration updated")
