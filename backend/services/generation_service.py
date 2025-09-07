"""Text generation service combining Markov and neural models."""
import random
from collections import defaultdict
from typing import Dict, List, Tuple, Optional

import torch
import numpy as np
from sqlalchemy import text
import logging
logger = logging.getLogger(__name__)

from backend.core.database import SessionLocal
from backend.services.neural_service import HybridCharModel, VOCAB, CHAR2IDX, IDX2CHAR

def load_markov_tables() -> Dict[int, Dict[str, Dict[str, float]]]:
    """Load n-gram tables from DB as nested dicts."""
    tables = {2: defaultdict(dict), 3: defaultdict(dict), 4: defaultdict(dict)}
    
    with SessionLocal() as session:
        try:
            rows = session.execute(text("SELECT n, context, next_char, count FROM markov_ngrams"))
        except Exception as e:
            logger.exception("Failed loading markov tables: %s", e)
            return tables
        for n, context, next_char, count in rows:
            if n in tables:
                tables[n][context][next_char] = count
    
    # Normalize to probabilities
    for n in tables:
        for context in tables[n]:
            total = sum(tables[n][context].values())
            if total > 0:
                for char in tables[n][context]:
                    tables[n][context][char] /= total
    
    return tables

def load_neural_model() -> Optional[HybridCharModel]:
    """Load latest neural checkpoint."""
    with SessionLocal() as session:
        result = session.execute(text("SELECT path FROM neural_checkpoints ORDER BY created_at DESC LIMIT 1"))
        row = result.first()
        if not row:
            return None
        
        model = HybridCharModel()
        try:
            model.load_state_dict(torch.load(row[0], map_location='cpu'))
            model.eval()
            return model
        except:
            return None

def get_markov_probs(context: str, tables: Dict, weights: Dict[str, float]) -> Dict[str, float]:
    """Get blended Markov probabilities for context."""
    probs = defaultdict(float)
    total_weight = 0
    
    for n in [4, 3, 2]:  # Try higher orders first
        if n <= len(context) and weights.get(f"{n}gram", 0) > 0:
            ctx = context[-(n-1):] if n > 1 else ""
            if ctx in tables[n]:
                weight = weights[f"{n}gram"]
                total_weight += weight
                for char, prob in tables[n][ctx].items():
                    probs[char] += weight * prob
    
    if total_weight > 0:
        for char in probs:
            probs[char] /= total_weight
    
    return dict(probs)

def get_neural_probs(context: str, model: HybridCharModel) -> Dict[str, float]:
    """Get neural model probabilities."""
    if model is None:
        return {}
    
    # Pad/truncate to sequence length
    seq_len = 11
    indices = [CHAR2IDX.get(c, 0) for c in context[-seq_len:]]
    while len(indices) < seq_len:
        indices.insert(0, 0)  # Pad with space
    
    with torch.no_grad():
        x = torch.tensor([indices], dtype=torch.long)
        logits = model(x)[0]
        probs = torch.softmax(logits, dim=0)
        
    return {IDX2CHAR[i]: probs[i].item() for i in range(len(IDX2CHAR))}

def apply_temperature(probs: Dict[str, float], temperature: float) -> Dict[str, float]:
    """Apply temperature scaling to probabilities."""
    if temperature == 1.0 or not probs:
        return probs
    
    # Convert to log space, scale, convert back
    chars = list(probs.keys())
    values = np.array([probs[c] for c in chars])
    values = np.clip(values, 1e-10, 1.0)  # Avoid log(0)
    
    log_probs = np.log(values) / temperature
    exp_probs = np.exp(log_probs - np.max(log_probs))  # Numerical stability
    exp_probs /= np.sum(exp_probs)
    
    return {chars[i]: exp_probs[i] for i in range(len(chars))}

def sample_char(probs: Dict[str, float]) -> str:
    """Sample a character from probability distribution."""
    if not probs:
        return ' '
    
    chars = list(probs.keys())
    weights = list(probs.values())
    return random.choices(chars, weights=weights)[0]

def generate_text(
    n_chars: int,
    prompt: str = "",
    bigram_weight: float = 0.2,
    trigram_weight: float = 0.3,
    tetragram_weight: float = 0.5,
    neural_weight: float = 0.8,
    temperature: float = 1.0
) -> str:
    """Generate text using hybrid Markov-neural model."""
    
    # Load models
    markov_tables = load_markov_tables()
    neural_model = load_neural_model()
    
    # Normalize Markov weights
    total_markov = bigram_weight + trigram_weight + tetragram_weight
    if total_markov > 0:
        weights = {
            "2gram": bigram_weight / total_markov,
            "3gram": trigram_weight / total_markov,
            "4gram": tetragram_weight / total_markov
        }
    else:
        weights = {"2gram": 0, "3gram": 0, "4gram": 0}
    
    # Clean prompt
    clean_prompt = ''.join(c for c in prompt.upper() if c in CHAR2IDX)
    context = clean_prompt
    
    # Generate characters
    for _ in range(n_chars):
        # Get Markov probabilities
        markov_probs = get_markov_probs(context, markov_tables, weights)
        
        # Get neural probabilities
        neural_probs = get_neural_probs(context, neural_model)
        
        # Blend probabilities
        final_probs = {}
        all_chars = set(markov_probs.keys()) | set(neural_probs.keys())
        
        for char in all_chars:
            m_prob = markov_probs.get(char, 0)
            n_prob = neural_probs.get(char, 0)
            final_probs[char] = (1 - neural_weight) * m_prob + neural_weight * n_prob
        
        # Apply temperature
        final_probs = apply_temperature(final_probs, temperature)
        
        # Sample next character
        next_char = sample_char(final_probs)
        context += next_char
    
    return context
