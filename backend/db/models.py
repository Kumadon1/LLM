"""
Database Models
SQLAlchemy ORM models for all database tables
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column, Integer, String, Text, Float, DateTime, JSON, 
    ForeignKey, Index, UniqueConstraint, Boolean
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class NeuralConfig(Base):
    """Neural network configuration model"""
    __tablename__ = 'neural_configs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    config = Column(JSON, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    training_jobs = relationship("TrainingJob", back_populates="neural_config")
    
    # Indexes
    __table_args__ = (
        Index('idx_neural_configs_created_at', 'created_at'),
        Index('idx_neural_configs_name', 'name'),
    )
    
    def __repr__(self):
        return f"<NeuralConfig(id={self.id}, name='{self.name}')>"


class TextCorpus(Base):
    """Text corpus model for training data"""
    __tablename__ = 'text_corpus'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    source = Column(String(255), nullable=True)
    meta_data = Column('metadata', JSON, nullable=True)  # Map to 'metadata' column in DB
    word_count = Column(Integer, nullable=True)
    char_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    training_jobs = relationship("TrainingJob", back_populates="text_corpus")
    
    # Indexes
    __table_args__ = (
        Index('idx_text_corpus_created_at', 'created_at'),
        Index('idx_text_corpus_source', 'source'),
    )
    
    def __repr__(self):
        return f"<TextCorpus(id={self.id}, title='{self.title}')>"


class GenerationHistory(Base):
    """History of text generations"""
    __tablename__ = 'generation_history'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    model = Column(String(100), nullable=True)
    parameters = Column(JSON, nullable=True)
    quality_score = Column(Float, nullable=True)
    user_rating = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Indexes
    __table_args__ = (
        Index('idx_generation_history_created_at', 'created_at'),
        Index('idx_generation_history_model', 'model'),
    )
    
    def __repr__(self):
        return f"<GenerationHistory(id={self.id}, model='{self.model}')>"


class AccuracyMetric(Base):
    """Model accuracy metrics"""
    __tablename__ = 'accuracy_metrics'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    metric_type = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    meta_data = Column('metadata', JSON, nullable=True)  # Map to 'metadata' column in DB
    model_checkpoint_id = Column(Integer, ForeignKey('neural_checkpoints.id'), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    checkpoint = relationship("NeuralCheckpoint", back_populates="metrics")
    
    # Indexes
    __table_args__ = (
        Index('idx_accuracy_metrics_created_at', 'created_at'),
        Index('idx_accuracy_metrics_type', 'metric_type'),
        Index('idx_accuracy_metrics_checkpoint', 'model_checkpoint_id'),
    )
    
    def __repr__(self):
        return f"<AccuracyMetric(id={self.id}, type='{self.metric_type}', value={self.value})>"


class MarkovNGram(Base):
    """Markov n-gram model"""
    __tablename__ = 'markov_ngrams'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    n = Column(Integer, nullable=False)  # 2, 3, or 4
    context = Column(String(255), nullable=False)
    next_char = Column(String(1), nullable=False)
    count = Column(Integer, default=1)
    probability = Column(Float, nullable=True)
    
    # Unique constraint and indexes
    __table_args__ = (
        UniqueConstraint('n', 'context', 'next_char', name='uq_markov_key'),
        Index('idx_markov_n', 'n'),
        Index('idx_markov_context', 'context'),
        Index('idx_markov_n_context', 'n', 'context'),
    )
    
    def __repr__(self):
        return f"<MarkovNGram(n={self.n}, context='{self.context}', next='{self.next_char}')>"


class NeuralCheckpoint(Base):
    """Neural model checkpoints"""
    __tablename__ = 'neural_checkpoints'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    epochs = Column(Integer, nullable=False)
    block_size = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False)
    notes = Column(Text, nullable=True)
    loss = Column(Float, nullable=True)
    accuracy = Column(Float, nullable=True)
    is_best = Column(Boolean, default=False)
    training_job_id = Column(Integer, ForeignKey('training_jobs.id'), nullable=True)
    
    # Relationships
    metrics = relationship("AccuracyMetric", back_populates="checkpoint")
    training_job = relationship("TrainingJob", back_populates="checkpoints")
    
    # Indexes
    __table_args__ = (
        Index('idx_neural_checkpoints_created_at', 'created_at'),
        Index('idx_neural_checkpoints_is_best', 'is_best'),
        Index('idx_neural_checkpoints_training_job', 'training_job_id'),
    )
    
    def __repr__(self):
        return f"<NeuralCheckpoint(id={self.id}, epochs={self.epochs}, loss={self.loss})>"


class TrainingJob(Base):
    """Training job tracking"""
    __tablename__ = 'training_jobs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    job_id = Column(String(100), unique=True, nullable=False)
    status = Column(String(50), nullable=False)  # queued, running, success, error
    progress = Column(Integer, default=0)
    message = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    neural_config_id = Column(Integer, ForeignKey('neural_configs.id'), nullable=True)
    text_corpus_id = Column(Integer, ForeignKey('text_corpus.id'), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    neural_config = relationship("NeuralConfig", back_populates="training_jobs")
    text_corpus = relationship("TextCorpus", back_populates="training_jobs")
    checkpoints = relationship("NeuralCheckpoint", back_populates="training_job")
    
    # Indexes
    __table_args__ = (
        Index('idx_training_jobs_job_id', 'job_id'),
        Index('idx_training_jobs_status', 'status'),
        Index('idx_training_jobs_created_at', 'created_at'),
    )
    
    def __repr__(self):
        return f"<TrainingJob(id={self.id}, job_id='{self.job_id}', status='{self.status}')>"


class DatabaseVersion(Base):
    """Database schema version tracking for migrations"""
    __tablename__ = 'database_versions'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    applied_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<DatabaseVersion(version='{self.version}')>"
