"""
Enhanced Database Repository using SQLAlchemy ORM
Repository pattern implementation with ORM models
"""
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import logging

from backend.db.engine import get_db_engine, db_session_scope
from backend.db.models import (
    NeuralConfig, TrainingJob, MarkovNGram, NeuralCheckpoint,
    TextCorpus, GenerationHistory, AccuracyMetric, DatabaseVersion
)

logger = logging.getLogger(__name__)


class DatabaseRepository:
    """Enhanced database repository using SQLAlchemy ORM"""
    
    def __init__(self):
        self.engine = get_db_engine()
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.engine.get_session()
    
    # Neural Config Operations
    def create_neural_config(self, name: str, config: Dict[str, Any]) -> NeuralConfig:
        """Create a new neural configuration"""
        with db_session_scope() as session:
            neural_config = NeuralConfig(
                name=name,
                config=config
            )
            session.add(neural_config)
            session.flush()
            session.refresh(neural_config)
            return neural_config
    
    def get_neural_config(self, config_id: int) -> Optional[NeuralConfig]:
        """Get neural config by ID"""
        with db_session_scope() as session:
            return session.query(NeuralConfig).filter_by(id=config_id).first()
    
    def get_neural_config_by_name(self, name: str) -> Optional[NeuralConfig]:
        """Get neural config by name"""
        with db_session_scope() as session:
            return session.query(NeuralConfig).filter_by(name=name).first()
    
    def list_neural_configs(self) -> List[NeuralConfig]:
        """List all neural configurations"""
        with db_session_scope() as session:
            return session.query(NeuralConfig).order_by(desc(NeuralConfig.created_at)).all()
    
    def update_neural_config(self, config_id: int, config: Dict[str, Any]) -> Optional[NeuralConfig]:
        """Update neural configuration"""
        with db_session_scope() as session:
            neural_config = session.query(NeuralConfig).filter_by(id=config_id).first()
            if neural_config:
                neural_config.config = config
                session.flush()
                session.refresh(neural_config)
            return neural_config
    
    def delete_neural_config(self, config_id: int) -> bool:
        """Delete neural configuration"""
        with db_session_scope() as session:
            neural_config = session.query(NeuralConfig).filter_by(id=config_id).first()
            if neural_config:
                session.delete(neural_config)
                return True
            return False
    
    # Training Job Operations
    def create_training_job(
        self,
        neural_config_id: Optional[int] = None,
        text_corpus_id: Optional[int] = None
    ) -> TrainingJob:
        """Create a new training job"""
        with db_session_scope() as session:
            job = TrainingJob(
                job_id=str(uuid.uuid4()),
                status='queued',
                progress=0,
                neural_config_id=neural_config_id,
                text_corpus_id=text_corpus_id
            )
            session.add(job)
            session.flush()
            session.refresh(job)
            return job
    
    def get_training_job(self, job_id: str) -> Optional[TrainingJob]:
        """Get training job by job ID"""
        with db_session_scope() as session:
            return session.query(TrainingJob).filter_by(job_id=job_id).first()
    
    def update_training_job(
        self,
        job_id: str,
        status: Optional[str] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        error: Optional[str] = None
    ) -> Optional[TrainingJob]:
        """Update training job status"""
        with db_session_scope() as session:
            job = session.query(TrainingJob).filter_by(job_id=job_id).first()
            if job:
                if status:
                    job.status = status
                    if status == 'running' and not job.started_at:
                        job.started_at = datetime.utcnow()
                    elif status in ['success', 'error'] and not job.completed_at:
                        job.completed_at = datetime.utcnow()
                
                if progress is not None:
                    job.progress = progress
                if message is not None:
                    job.message = message
                if error is not None:
                    job.error = error
                
                session.flush()
                session.refresh(job)
            return job
    
    def list_training_jobs(self, limit: int = 10) -> List[TrainingJob]:
        """List recent training jobs"""
        with db_session_scope() as session:
            return session.query(TrainingJob)\
                .order_by(desc(TrainingJob.created_at))\
                .limit(limit)\
                .all()
    
    # Corpus Operations
    def add_corpus_text(
        self,
        content: str,
        title: Optional[str] = None,
        source: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> TextCorpus:
        """Add text to corpus"""
        with db_session_scope() as session:
            corpus = TextCorpus(
                content=content,
                title=title,
                source=source,
                meta_data=metadata,  # Use meta_data instead of metadata
                word_count=len(content.split()),
                char_count=len(content)
            )
            session.add(corpus)
            session.flush()
            session.refresh(corpus)
            return corpus
    
    def get_corpus_text(self, corpus_id: int) -> Optional[TextCorpus]:
        """Get corpus text by ID"""
        with db_session_scope() as session:
            return session.query(TextCorpus).filter_by(id=corpus_id).first()
    
    def list_corpus_texts(self, limit: int = 10) -> List[TextCorpus]:
        """List corpus texts"""
        with db_session_scope() as session:
            return session.query(TextCorpus)\
                .order_by(desc(TextCorpus.created_at))\
                .limit(limit)\
                .all()
    
    def get_corpus_stats(self) -> Dict[str, Any]:
        """Get corpus statistics"""
        with db_session_scope() as session:
            total_texts = session.query(func.count(TextCorpus.id)).scalar()
            total_words = session.query(func.sum(TextCorpus.word_count)).scalar() or 0
            total_chars = session.query(func.sum(TextCorpus.char_count)).scalar() or 0
            
            return {
                'total_texts': total_texts,
                'total_words': total_words,
                'total_characters': total_chars,
                'average_words_per_text': total_words / total_texts if total_texts > 0 else 0
            }
    
    # Markov Model Operations
    def update_markov_ngram(self, n: int, context: str, next_char: str) -> MarkovNGram:
        """Update or create Markov n-gram"""
        with db_session_scope() as session:
            ngram = session.query(MarkovNGram).filter_by(
                n=n,
                context=context,
                next_char=next_char
            ).first()
            
            if ngram:
                ngram.count += 1
            else:
                ngram = MarkovNGram(
                    n=n,
                    context=context,
                    next_char=next_char,
                    count=1
                )
                session.add(ngram)
            
            session.flush()
            session.refresh(ngram)
            return ngram
    
    def get_markov_ngrams(self, n: int, context: str) -> List[MarkovNGram]:
        """Get Markov n-grams for given context"""
        with db_session_scope() as session:
            return session.query(MarkovNGram)\
                .filter_by(n=n, context=context)\
                .order_by(desc(MarkovNGram.count))\
                .all()
    
    def calculate_markov_probabilities(self, n: int):
        """Calculate probabilities for Markov n-grams"""
        with db_session_scope() as session:
            # Get all unique contexts for this n
            contexts = session.query(MarkovNGram.context).filter_by(n=n).distinct().all()
            
            for (context,) in contexts:
                # Get total count for this context
                total_count = session.query(func.sum(MarkovNGram.count))\
                    .filter_by(n=n, context=context)\
                    .scalar()
                
                if total_count:
                    # Update probabilities
                    ngrams = session.query(MarkovNGram).filter_by(n=n, context=context).all()
                    for ngram in ngrams:
                        ngram.probability = ngram.count / total_count
    
    def clear_markov_model(self, n: Optional[int] = None):
        """Clear Markov model data"""
        with db_session_scope() as session:
            if n:
                session.query(MarkovNGram).filter_by(n=n).delete()
            else:
                session.query(MarkovNGram).delete()
    
    # Neural Checkpoint Operations
    def create_checkpoint(
        self,
        epochs: int,
        block_size: int,
        path: str,
        loss: Optional[float] = None,
        accuracy: Optional[float] = None,
        notes: Optional[str] = None,
        training_job_id: Optional[int] = None,
        is_best: bool = False
    ) -> NeuralCheckpoint:
        """Create a neural model checkpoint"""
        with db_session_scope() as session:
            # If marking as best, unmark previous best
            if is_best:
                session.query(NeuralCheckpoint).update({'is_best': False})
            
            checkpoint = NeuralCheckpoint(
                epochs=epochs,
                block_size=block_size,
                path=path,
                loss=loss,
                accuracy=accuracy,
                notes=notes,
                training_job_id=training_job_id,
                is_best=is_best
            )
            session.add(checkpoint)
            session.flush()
            session.refresh(checkpoint)
            return checkpoint
    
    def get_best_checkpoint(self) -> Optional[NeuralCheckpoint]:
        """Get the best checkpoint"""
        with db_session_scope() as session:
            return session.query(NeuralCheckpoint).filter_by(is_best=True).first()
    
    def get_latest_checkpoint(self) -> Optional[NeuralCheckpoint]:
        """Get the latest checkpoint"""
        with db_session_scope() as session:
            return session.query(NeuralCheckpoint)\
                .order_by(desc(NeuralCheckpoint.created_at))\
                .first()
    
    def list_checkpoints(self, limit: int = 10) -> List[NeuralCheckpoint]:
        """List recent checkpoints"""
        with db_session_scope() as session:
            return session.query(NeuralCheckpoint)\
                .order_by(desc(NeuralCheckpoint.created_at))\
                .limit(limit)\
                .all()
    
    # Generation History Operations
    def record_generation(
        self,
        prompt: str,
        response: str,
        model: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        quality_score: Optional[float] = None
    ) -> GenerationHistory:
        """Record a text generation"""
        with db_session_scope() as session:
            generation = GenerationHistory(
                prompt=prompt,
                response=response,
                model=model,
                parameters=parameters,
                quality_score=quality_score
            )
            session.add(generation)
            session.flush()
            session.refresh(generation)
            return generation
    
    def get_generation_history(self, limit: int = 10) -> List[GenerationHistory]:
        """Get generation history"""
        with db_session_scope() as session:
            return session.query(GenerationHistory)\
                .order_by(desc(GenerationHistory.created_at))\
                .limit(limit)\
                .all()
    
    def clear_generation_history(self):
        """Clear all generation history"""
        with db_session_scope() as session:
            session.query(GenerationHistory).delete()
    
    def update_generation_rating(self, generation_id: int, rating: int) -> Optional[GenerationHistory]:
        """Update user rating for a generation"""
        with db_session_scope() as session:
            generation = session.query(GenerationHistory).filter_by(id=generation_id).first()
            if generation:
                generation.user_rating = rating
                session.flush()
                session.refresh(generation)
            return generation
    
    # Accuracy Metrics Operations
    def record_accuracy(
        self,
        metric_type: str,
        value: float,
        metadata: Optional[Dict[str, Any]] = None,
        checkpoint_id: Optional[int] = None
    ) -> AccuracyMetric:
        """Record an accuracy metric"""
        with db_session_scope() as session:
            metric = AccuracyMetric(
                metric_type=metric_type,
                value=value,
                meta_data=metadata,  # Use meta_data instead of metadata
                model_checkpoint_id=checkpoint_id
            )
            session.add(metric)
            session.flush()
            session.refresh(metric)
            return metric
    
    def get_accuracy_metrics(
        self,
        metric_type: Optional[str] = None,
        checkpoint_id: Optional[int] = None,
        limit: int = 100
    ) -> List[AccuracyMetric]:
        """Get accuracy metrics"""
        with db_session_scope() as session:
            query = session.query(AccuracyMetric)
            
            if metric_type:
                query = query.filter_by(metric_type=metric_type)
            if checkpoint_id:
                query = query.filter_by(model_checkpoint_id=checkpoint_id)
            
            return query.order_by(desc(AccuracyMetric.created_at)).limit(limit).all()
    
    def get_accuracy_summary(self) -> Dict[str, Any]:
        """Get summary of accuracy metrics"""
        with db_session_scope() as session:
            metrics = session.query(
                AccuracyMetric.metric_type,
                func.avg(AccuracyMetric.value).label('avg_value'),
                func.min(AccuracyMetric.value).label('min_value'),
                func.max(AccuracyMetric.value).label('max_value'),
                func.count(AccuracyMetric.id).label('count')
            ).group_by(AccuracyMetric.metric_type).all()
            
            return [
                {
                    'metric_type': m.metric_type,
                    'average': m.avg_value,
                    'minimum': m.min_value,
                    'maximum': m.max_value,
                    'count': m.count
                }
                for m in metrics
            ]
    
    # Database Management
    def get_database_version(self) -> Optional[str]:
        """Get current database version"""
        with db_session_scope() as session:
            version = session.query(DatabaseVersion)\
                .order_by(desc(DatabaseVersion.applied_at))\
                .first()
            return version.version if version else None
    
    def set_database_version(self, version: str, description: Optional[str] = None):
        """Set database version"""
        with db_session_scope() as session:
            db_version = DatabaseVersion(
                version=version,
                description=description
            )
            session.add(db_version)
    
    def get_table_stats(self) -> Dict[str, int]:
        """Get row counts for all tables"""
        with db_session_scope() as session:
            return {
                'neural_configs': session.query(func.count(NeuralConfig.id)).scalar(),
                'training_jobs': session.query(func.count(TrainingJob.id)).scalar(),
                'text_corpus': session.query(func.count(TextCorpus.id)).scalar(),
                'markov_ngrams': session.query(func.count(MarkovNGram.id)).scalar(),
                'neural_checkpoints': session.query(func.count(NeuralCheckpoint.id)).scalar(),
                'generation_history': session.query(func.count(GenerationHistory.id)).scalar(),
                'accuracy_metrics': session.query(func.count(AccuracyMetric.id)).scalar(),
            }
    
    def vacuum_database(self):
        """Vacuum database (SQLite specific)"""
        if 'sqlite' in str(self.engine.engine.url):
            with self.engine.engine.connect() as conn:
                conn.execute("VACUUM")
                logger.info("Database vacuumed")
    
    def analyze_database(self):
        """Analyze database for query optimization"""
        if 'sqlite' in str(self.engine.engine.url):
            with self.engine.engine.connect() as conn:
                conn.execute("ANALYZE")
                logger.info("Database analyzed")


# Singleton instance
_repository: Optional[DatabaseRepository] = None


def get_repository() -> DatabaseRepository:
    """Get or create the database repository instance"""
    global _repository
    if _repository is None:
        _repository = DatabaseRepository()
    return _repository
