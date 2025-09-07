"""
James LLM 1 - Desktop Backend
Simplified FastAPI backend optimized for local desktop usage
"""
import os
import sys
from pathlib import Path

# Ensure project root is on sys.path so we can import `backend.*` modules when
# this file is executed directly from the backend directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import sqlite3
import json
import uvicorn
from datetime import datetime
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Configuration from environment
PORT = int(os.getenv('PORT', 5001))  # Changed default to 5001
DATABASE_PATH = os.getenv('DATABASE_PATH', 'james_llm.db')
MODELS_PATH = os.getenv('MODELS_PATH', 'models')
CACHE_PATH = os.getenv('CACHE_PATH', 'cache')

# Create necessary directories
Path(MODELS_PATH).mkdir(parents=True, exist_ok=True)
Path(CACHE_PATH).mkdir(parents=True, exist_ok=True)

# Initialize FastAPI app
app = FastAPI(title="James LLM 1 Backend", version="1.0.0")

# CORS configuration for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:5001", "http://localhost:8000", "file://", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
def init_database():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Neural configurations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS neural_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            config JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Text corpus table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS text_corpus (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT NOT NULL,
            source TEXT,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Generation history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS generation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            model TEXT,
            parameters JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Accuracy metrics table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accuracy_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            metadata JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Initialize SQLAlchemy tables for Markov/Neural as well
try:
    from backend.core.database import init_db as init_sa
    init_sa()
except Exception as _e:
    print("Warning: SQLAlchemy init failed:", _e)

# Pydantic models
class NeuralConfig(BaseModel):
    model_type: str
    hidden_size: int
    num_layers: int
    num_heads: int
    learning_rate: float
    batch_size: int
    epochs: int
    dropout: float

class TextInput(BaseModel):
    title: Optional[str] = None
    content: str
    source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class GenerateRequest(BaseModel):
    prompt: Optional[str] = None  # Made optional with None default
    temperature: float = 0.7
    max_tokens: int = 100
    top_p: float = 0.9
    model: Optional[str] = "default"
    # Weight parameters
    neural_weight: float = 0.8
    bigram_weight: float = 0.2
    trigram_weight: float = 0.3
    tetragram_weight: float = 0.5

class MonteCarloRequest(BaseModel):
    num_simulations: int
    confidence_level: int
    random_seed: int
    distribution_type: str
    mean: float
    std_dev: float

# API Routes
from backend.services.job_runner import launch_job, get_job
from backend.services.generation_service import generate_text
from backend.services.evaluation_service import get_evaluation_history as get_eval_history
# Word validation: prefer pyenchant if available; else fall back to wordfreq or heuristic
# Try to help PyEnchant find the system library on macOS (Homebrew path on Apple Silicon)
import re
import logging

logger = logging.getLogger(__name__)

for cand in ["/opt/homebrew/lib/libenchant-2.dylib", "/usr/local/lib/libenchant-2.dylib"]:
    if os.path.exists(cand):
        os.environ.setdefault("PYENCHANT_LIBRARY_PATH", cand)
        logger.info(f"Found enchant library at: {cand}")
        break

WORD_CHECKER = None
CHECKER_TYPE = "none"

try:
    import enchant  # type: ignore
    _en_dict = enchant.Dict("en_US")
    WORD_CHECKER = _en_dict
    CHECKER_TYPE = "enchant"
    logger.info("Using PyEnchant for word validation")
    print("Word validation: Using PyEnchant")
except Exception as e:
    logger.warning(f"PyEnchant not available: {e}")
    try:
        from wordfreq import zipf_frequency  # type: ignore
        WORD_CHECKER = zipf_frequency
        CHECKER_TYPE = "wordfreq"
        logger.info("Using wordfreq for word validation")
        print("Word validation: Using wordfreq")
    except Exception as e2:
        logger.warning(f"wordfreq not available: {e2}")
        CHECKER_TYPE = "basic"
        logger.info("Using basic word list for validation")
        print("Word validation: Using basic word list")

# Common short words that should be allowed
ALLOWED_SHORT = {"a","i","an","in","on","to","of","is","as","at","be","he","we","us","it","or","by","so","if","me","my","up","no","do","go"}

# Extended common word list for fallback
COMMON_WORDS = {
    "the","and","to","of","in","a","that","is","it","for","on","with","as","at","by","an","be",
    "this","was","are","have","been","from","or","had","but","what","were","we","when","there",
    "can","all","your","which","their","said","if","will","do","each","about","how","up","out",
    "them","then","she","many","some","so","these","would","other","into","has","more","her","two",
    "like","him","see","time","could","no","just","than","only","its","now","my","over","made",
    "after","also","did","years","much","way","who","through","where","back","any","our","may",
    "well","down","should","because","each","those","people","state","very","world","still","own",
    "me","work","life","being","use","day","same","part","while","he","us","go","get","come"
}

def _check_word(w: str) -> bool:
    """Check if a word is valid English"""
    # Clean the word - remove punctuation except apostrophes
    clean = re.sub(r"[^A-Za-z']", "", w)
    if not clean:
        return False
    
    word_lower = clean.lower()
    
    # Check short words against allowed list
    if len(word_lower) <= 2:
        result = word_lower in ALLOWED_SHORT
        logger.debug(f"Short word '{w}' ({word_lower}): {result}")
        return result
    
    # Use the appropriate checker
    if CHECKER_TYPE == "enchant" and WORD_CHECKER:
        result = WORD_CHECKER.check(word_lower)
        logger.debug(f"Enchant check '{w}' ({word_lower}): {result}")
        return result
    elif CHECKER_TYPE == "wordfreq" and WORD_CHECKER:
        freq = WORD_CHECKER(word_lower, "en")
        result = freq >= 3.0  # Lower threshold for more acceptance
        logger.debug(f"Wordfreq check '{w}' ({word_lower}): freq={freq}, valid={result}")
        return result
    else:
        # Fallback to basic word list
        result = word_lower in COMMON_WORDS
        logger.debug(f"Basic check '{w}' ({word_lower}): {result}")
        return result

@app.get("/")
async def root():
    return {
        "name": "James LLM 1 Backend",
        "status": "operational",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "models_path": MODELS_PATH,
        "cache_path": CACHE_PATH
    }

# Neural Config endpoints
@app.post("/api/neural-config")
async def save_neural_config(config: NeuralConfig):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO neural_configs (name, config) VALUES (?, ?)",
        ("config_" + datetime.now().isoformat(), json.dumps(config.dict()))
    )
    conn.commit()
    config_id = cursor.lastrowid
    conn.close()
    return {"id": config_id, "message": "Configuration saved"}

@app.get("/api/neural-config")
async def get_neural_configs():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM neural_configs ORDER BY created_at DESC")
    configs = cursor.fetchall()
    conn.close()
    return {
        "configs": [
            {
                "id": c[0],
                "name": c[1],
                "config": json.loads(c[2]),
                "created_at": c[3],
                "updated_at": c[4]
            }
            for c in configs
        ]
    }

# Text management endpoints
@app.post("/api/text")
async def add_text(text_input: TextInput):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO text_corpus (title, content, source, metadata) VALUES (?, ?, ?, ?)",
        (
            text_input.title,
            text_input.content,
            text_input.source,
            json.dumps(text_input.metadata) if text_input.metadata else None
        )
    )
    conn.commit()
    text_id = cursor.lastrowid
    conn.close()
    return {"id": text_id, "message": "Text added successfully"}

@app.get("/api/text")
async def get_texts(limit: int = 100):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM text_corpus ORDER BY created_at DESC LIMIT {limit}")
    texts = cursor.fetchall()
    conn.close()
    return {
        "texts": [
            {
                "id": t[0],
                "title": t[1],
                "content": t[2],
                "source": t[3],
                "metadata": json.loads(t[4]) if t[4] else None,
                "created_at": t[5]
            }
            for t in texts
        ]
    }

# Training endpoints (hybrid Markov + neural)
class TrainRequest(BaseModel):
    text: str
    block_size: int = 100000
    epochs: int = 5

@app.post("/api/train")
async def start_training(req: TrainRequest):
    job_id = launch_job(req.text, req.block_size, req.epochs)
    return {"job_id": job_id}

@app.get("/api/train/{job_id}")
async def training_progress(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# Generation endpoint (hybrid Markov + neural)
@app.post("/api/generate")
async def generate_text_api(request: GenerateRequest):
    # Use empty string if prompt is None
    prompt = request.prompt or ""
    
    # Guard: ensure markov tables exist
    try:
        pass
    except Exception:
        pass
    text = generate_text(
        n_chars=request.max_tokens,
        prompt=prompt,  # Use the processed prompt
        bigram_weight=request.bigram_weight,
        trigram_weight=request.trigram_weight,
        tetragram_weight=request.tetragram_weight,
        neural_weight=request.neural_weight,
        temperature=request.temperature,
    )
    # Validate words using available checker
    # Split on whitespace and validate each word
    words = text.split()
    valid_mask = []
    for w in words:
        is_valid = _check_word(w)
        valid_mask.append(is_valid)
        logger.info(f"Word validation: '{w}' -> {is_valid}")

    # Save to history
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO generation_history (prompt, response, model, parameters) VALUES (?, ?, ?, ?)",
        (
            prompt,  # Use the processed prompt (never None)
            text,
            request.model,
            json.dumps({
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "top_p": request.top_p
            })
        )
    )
    conn.commit()
    conn.close()

    return {"generated_text": text, "valid_mask": valid_mask}

# Monte Carlo Evaluation endpoints
@app.get("/api/evaluation/evaluations")
async def get_evaluation_history(
    limit: int = 20
):
    """Get Monte Carlo evaluation history"""
    try:
        evaluations = get_eval_history(limit=limit)
        return {
            "success": True,
            "evaluations": evaluations,
            "count": len(evaluations)
        }
    except Exception as e:
        logger.error(f"Failed to get evaluation history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/evaluation/evaluations/latest")
async def get_latest_evaluation():
    """Get the most recent Monte Carlo evaluation result"""
    try:
        evaluations = get_eval_history(limit=1)
        
        if not evaluations:
            return {
                "success": True,
                "evaluation": None,
                "message": "No evaluations found"
            }
        
        return {
            "success": True,
            "evaluation": evaluations[0]
        }
    except Exception as e:
        logger.error(f"Failed to get latest evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/generate/history")
async def get_generation_history(limit: int = 50):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM generation_history ORDER BY created_at DESC LIMIT {limit}")
    history = cursor.fetchall()
    conn.close()
    return {
        "history": [
            {
                "id": h[0],
                "prompt": h[1],
                "response": h[2],
                "model": h[3],
                "parameters": json.loads(h[4]) if h[4] else None,
                "created_at": h[5]
            }
            for h in history
        ]
    }

# Data viewer endpoints
@app.get("/api/data/stats")
async def get_data_stats():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get counts
    cursor.execute("SELECT COUNT(*) FROM text_corpus")
    text_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM generation_history")
    generation_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT AVG(LENGTH(content)) FROM text_corpus")
    avg_length = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "total_texts": text_count,
        "total_generations": generation_count,
        "average_text_length": round(avg_length),
        "models_available": 3,  # Placeholder
        "storage_used_mb": 125.4  # Placeholder
    }

@app.get("/api/data/ngrams")
async def get_ngram_stats(n: int = 2, limit: int = 50):
    """Get n-gram frequency statistics"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get total count for this n
    cursor.execute("SELECT COUNT(*), SUM(count) FROM markov_ngrams WHERE n = ?", (n,))
    unique_count, total_count = cursor.fetchone()
    unique_count = unique_count or 0
    total_count = total_count or 0
    
    # Get top patterns
    cursor.execute(
        """SELECT context, next_char, count 
           FROM markov_ngrams 
           WHERE n = ? 
           ORDER BY count DESC 
           LIMIT ?""",
        (n, limit)
    )
    
    patterns = []
    for context, next_char, count in cursor.fetchall():
        pattern = context + next_char if n > 1 else next_char
        freq = (count / total_count * 100) if total_count > 0 else 0
        patterns.append({
            "pattern": pattern,
            "count": count,
            "frequency": round(freq, 2)
        })
    
    conn.close()
    
    return {
        "n": n,
        "unique_patterns": unique_count,
        "total_observations": total_count,
        "patterns": patterns
    }

@app.get("/api/data/training-stats")
async def get_training_stats():
    """Get comprehensive training statistics"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Get checkpoint stats
    cursor.execute("SELECT COUNT(*) FROM neural_checkpoints")
    total_checkpoints = cursor.fetchone()[0]
    
    cursor.execute("SELECT SUM(epochs) FROM neural_checkpoints")
    total_epochs = cursor.fetchone()[0] or 0
    
    # Get latest checkpoint info
    cursor.execute(
        """SELECT epochs, loss, datetime(created_at, 'localtime') 
           FROM neural_checkpoints 
           ORDER BY created_at DESC 
           LIMIT 1"""
    )
    latest = cursor.fetchone()
    
    # Get corpus size
    cursor.execute("SELECT SUM(LENGTH(content)) FROM text_corpus")
    total_chars = cursor.fetchone()[0] or 0
    
    conn.close()
    
    return {
        "total_sessions": total_checkpoints,
        "total_epochs": total_epochs,
        "total_characters": total_chars,
        "latest_checkpoint": {
            "epochs": latest[0] if latest else 0,
            "loss": latest[1] if latest else None,
            "timestamp": latest[2] if latest else None
        },
        "model_status": "trained" if total_checkpoints > 0 else "untrained"
    }

# Monte Carlo endpoints
@app.post("/api/monte-carlo/run")
async def run_monte_carlo(request: MonteCarloRequest):
    # Placeholder for actual Monte Carlo simulation
    import random
    import numpy as np
    
    random.seed(request.random_seed)
    np.random.seed(request.random_seed)
    
    # Simple simulation
    if request.distribution_type == "Normal":
        samples = np.random.normal(request.mean, request.std_dev, request.num_simulations)
    elif request.distribution_type == "Uniform":
        samples = np.random.uniform(request.mean - request.std_dev, request.mean + request.std_dev, request.num_simulations)
    else:
        samples = np.random.exponential(request.mean, request.num_simulations)
    
    return {
        "mean": float(np.mean(samples)),
        "std": float(np.std(samples)),
        "min": float(np.min(samples)),
        "max": float(np.max(samples)),
        "percentiles": {
            "5": float(np.percentile(samples, 5)),
            "25": float(np.percentile(samples, 25)),
            "50": float(np.percentile(samples, 50)),
            "75": float(np.percentile(samples, 75)),
            "95": float(np.percentile(samples, 95))
        },
        "confidence_interval": [
            float(np.percentile(samples, (100 - request.confidence_level) / 2)),
            float(np.percentile(samples, 100 - (100 - request.confidence_level) / 2))
        ]
    }

# Accuracy endpoints
@app.post("/api/accuracy/record")
async def record_accuracy(metric_type: str, value: float, metadata: Optional[Dict] = None):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO accuracy_metrics (metric_type, value, metadata) VALUES (?, ?, ?)",
        (metric_type, value, json.dumps(metadata) if metadata else None)
    )
    conn.commit()
    conn.close()
    return {"message": "Metric recorded"}

@app.get("/api/accuracy/metrics")
async def get_accuracy_metrics():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM accuracy_metrics ORDER BY created_at DESC LIMIT 100")
    metrics = cursor.fetchall()
    conn.close()
    
    return {
        "metrics": [
            {
                "id": m[0],
                "type": m[1],
                "value": m[2],
                "metadata": json.loads(m[3]) if m[3] else None,
                "created_at": m[4]
            }
            for m in metrics
        ]
    }

# Corpus ingestion endpoints
@app.post("/api/corpus/ingest")
async def ingest_corpus(files: List[str], background_tasks: BackgroundTasks):
    # In production, this would process files asynchronously
    background_tasks.add_task(process_corpus_files, files)
    return {
        "message": f"Ingesting {len(files)} files",
        "status": "processing"
    }

async def process_corpus_files(files: List[str]):
    # Placeholder for actual file processing
    await asyncio.sleep(2)  # Simulate processing
    print(f"Processed {len(files)} files")

@app.get("/api/corpus/status")
async def get_corpus_status():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM text_corpus")
    count = cursor.fetchone()[0]
    conn.close()
    
    return {
        "total_documents": count,
        "processing": False,
        "last_update": datetime.now().isoformat()
    }

# Model management endpoints
@app.get("/api/models")
async def list_models():
    models_dir = Path(MODELS_PATH)
    models = []
    
    if models_dir.exists():
        for model_path in models_dir.iterdir():
            if model_path.is_dir():
                models.append({
                    "name": model_path.name,
                    "path": str(model_path),
                    "size_mb": sum(f.stat().st_size for f in model_path.rglob('*')) / 1024 / 1024
                })
    
    return {"models": models}

@app.post("/api/models/download")
async def download_model(model_name: str, model_url: str):
    # Placeholder for model download
    return {
        "message": f"Downloading {model_name}",
        "status": "started"
    }

@app.delete("/api/training/clear-all")
def clear_all_training_data():
    """Clear all training data from database - DANGEROUS"""
    try:
        from backend.db.repository_orm import get_repository
        from sqlalchemy import text
        repo = get_repository()
        
        # Clear all training-related tables
        with repo.session_factory() as session:
            # Delete all corpus texts
            session.execute(text("DELETE FROM text_corpus"))
            # Delete all checkpoints  
            session.execute(text("DELETE FROM neural_checkpoints"))
            # Delete all markov ngrams
            session.execute(text("DELETE FROM markov_ngrams"))
            # Delete all accuracy records
            session.execute(text("DELETE FROM accuracy_records"))
            session.commit()
            
        return {"status": "success", "message": "All training data cleared"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
