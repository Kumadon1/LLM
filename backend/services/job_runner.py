import logging
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4
from typing import Dict
from threading import Lock

from backend.services.training_service import train_with_persistence

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=2)
_jobs: Dict[str, Dict] = {}
_jobs_lock = Lock()


def _run_job(job_id: str, text: str, block_size: int, epochs: int):
    try:
        logger.info("job %s: starting persistent training", job_id)
        _update(job_id, 0, "Initializing training...")
        
        # Use the new persistent training service
        def progress_cb(pct: int, msg: str):
            _update(job_id, pct, msg)
        
        checkpoint_path, stats = train_with_persistence(
            text=text,
            block_size=block_size,
            epochs=epochs,
            progress_callback=progress_cb
        )
        
        _update(job_id, 100, f"Completed - Checkpoint: {checkpoint_path}")
        _set_status(job_id, "success")
        logger.info("job %s: completed with stats: %s", job_id, stats)
    except Exception as e:
        logger.exception("job %s failed: %s", job_id, e)
        _update(job_id, 100, f"Failed: {e}")
        _set_status(job_id, "error", str(e))


def _update(job_id: str, percent: int, message: str):
    with _jobs_lock:
        _jobs[job_id]["progress"] = percent
        _jobs[job_id]["message"] = message


def _set_status(job_id: str, status: str, error: str | None = None):
    with _jobs_lock:
        _jobs[job_id]["status"] = status
        if error:
            _jobs[job_id]["error"] = error


def launch_job(text: str, block_size: int, epochs: int) -> str:
    job_id = str(uuid4())
    with _jobs_lock:
        _jobs[job_id] = {"progress": 0, "message": "Queued", "status": "queued"}
    _executor.submit(_run_job, job_id, text, block_size, epochs)
    return job_id


def get_job(job_id: str):
    with _jobs_lock:
        return _jobs.get(job_id)

