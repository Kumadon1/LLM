"""
Enhanced Training Service
Properly persists training data and accumulates across sessions
"""
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Callable, List, Tuple
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from backend.db.repository_orm import get_repository
from backend.services.markov_service import process_text_block
from backend.services.evaluation_service import run_monte_carlo_evaluation

logger = logging.getLogger(__name__)

# Character vocabulary
VOCAB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ "
CHAR2IDX = {c: i for i, c in enumerate(VOCAB)}
IDX2CHAR = {i: c for c, i in CHAR2IDX.items()}
VOCAB_SIZE = len(VOCAB)
SEQ_LEN = 11  # context window


class PersistentTextDataset(Dataset):
    """Dataset that loads and accumulates text from the database"""
    
    def __init__(self, max_chars: int = 1_000_000):
        """
        Initialize dataset from persistent text corpus
        
        Args:
            max_chars: Maximum characters to load (to manage memory)
        """
        self.data = []
        self.repo = get_repository()
        
        logger.info("Loading text corpus from database...")
        
        # Load all text from corpus, accumulating across sessions
        corpus_texts = self.repo.list_corpus_texts(limit=1000)  # Get more texts
        
        total_chars = 0
        for corpus in corpus_texts:
            if total_chars >= max_chars:
                break
                
            # Clean and convert text to indices
            cleaned_text = self._clean_text(corpus.content)
            for char in cleaned_text:
                if char in CHAR2IDX:
                    self.data.append(CHAR2IDX[char])
                    total_chars += 1
                    
                    if total_chars >= max_chars:
                        break
        
        logger.info(f"Loaded {total_chars} characters from {len(corpus_texts)} corpus entries")
        
        # If we don't have enough data, add some default text
        if len(self.data) < SEQ_LEN + 1:
            logger.warning("Insufficient training data, adding default text")
            default_text = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG " * 100
            for char in self._clean_text(default_text):
                if char in CHAR2IDX:
                    self.data.append(CHAR2IDX[char])
    
    def _clean_text(self, text: str) -> str:
        """Clean text to only include vocabulary characters"""
        return ''.join(c for c in text.upper() if c in VOCAB)
    
    def __len__(self):
        return max(0, len(self.data) - SEQ_LEN)
    
    def __getitem__(self, idx):
        x = torch.tensor(self.data[idx:idx + SEQ_LEN], dtype=torch.long)
        y = torch.tensor(self.data[idx + SEQ_LEN], dtype=torch.long)
        return x, y


class ImprovedCharModel(nn.Module):
    """Improved character-level model with better architecture"""
    
    def __init__(self, vocab_size: int = VOCAB_SIZE, embed_dim: int = 64, 
                 hidden_dim: int = 256, num_layers: int = 2):
        super().__init__()
        
        # Embedding layer
        self.embed = nn.Embedding(vocab_size, embed_dim)
        
        # CNN for local pattern extraction
        self.cnn = nn.Sequential(
            nn.Conv1d(embed_dim, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.Conv1d(128, 128, kernel_size=3, padding=1),
            nn.ReLU(),
        )
        
        # Bidirectional LSTM for sequence modeling
        self.lstm = nn.LSTM(
            128, hidden_dim, 
            num_layers=num_layers, 
            batch_first=True, 
            bidirectional=True,
            dropout=0.2 if num_layers > 1 else 0
        )
        
        # Attention mechanism
        self.attention = nn.MultiheadAttention(
            hidden_dim * 2,  # bidirectional
            num_heads=4,
            dropout=0.1,
            batch_first=True
        )
        
        # Output layers
        self.output = nn.Sequential(
            nn.Linear(hidden_dim * 2, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, vocab_size)
        )
    
    def forward(self, x):
        # Embedding
        x = self.embed(x)  # (B, L, embed_dim)
        
        # CNN processing
        x = x.transpose(1, 2)  # (B, embed_dim, L)
        x = self.cnn(x)  # (B, 128, L)
        x = x.transpose(1, 2)  # (B, L, 128)
        
        # LSTM processing
        lstm_out, _ = self.lstm(x)  # (B, L, hidden_dim*2)
        
        # Self-attention
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Use last timestep for prediction
        final_hidden = attn_out[:, -1, :]  # (B, hidden_dim*2)
        
        # Output
        logits = self.output(final_hidden)  # (B, vocab_size)
        
        return logits


def persist_training_text(text: str, title: Optional[str] = None, 
                         source: Optional[str] = None) -> int:
    """
    Persist training text to database
    
    Args:
        text: The raw text to persist
        title: Optional title for the text
        source: Optional source identifier
    
    Returns:
        The ID of the persisted corpus entry
    """
    repo = get_repository()
    
    # Add text to corpus
    corpus = repo.add_corpus_text(
        content=text,
        title=title or f"Training text {datetime.now().isoformat()}",
        source=source or "training_api",
        metadata={  # This will be mapped to meta_data in the repository
            "training_timestamp": datetime.now().isoformat(),
            "original_length": len(text)
        }
    )
    
    logger.info(f"Persisted training text: {corpus.id} ({len(text)} chars)")
    
    return corpus.id


def train_with_persistence(
    text: str,
    block_size: int = 100_000,
    epochs: int = 5,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Tuple[str, dict]:
    """
    Train the neural model with persistent data accumulation
    
    Args:
        text: New text to add to training corpus
        block_size: Size of training blocks
        epochs: Number of training epochs
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        progress_callback: Optional callback for progress updates
    
    Returns:
        Tuple of (checkpoint_path, training_stats)
    """
    logger.info("Starting training with persistence")
    
    # Step 1: Persist the new training text
    if progress_callback:
        progress_callback(5, "Persisting training data...")
    
    corpus_id = persist_training_text(text)
    
    # Step 2: Process text for Markov model (in blocks)
    if progress_callback:
        progress_callback(10, "Processing Markov n-grams...")
    
    text_len = len(text)
    processed = 0
    block_num = 0
    
    while processed < text_len:
        end = min(processed + block_size, text_len)
        block = text[processed:end]
        
        # Process this block for Markov model
        process_text_block(block)
        
        processed = end
        block_num += 1
        
        if progress_callback:
            progress = 10 + int(20 * processed / text_len)
            progress_callback(progress, f"Processing block {block_num}...")
    
    # Step 3: Load accumulated dataset from all sessions
    if progress_callback:
        progress_callback(35, "Loading accumulated training data...")
    
    device = torch.device("cuda" if torch.cuda.is_available() else 
                         "mps" if torch.backends.mps.is_available() else "cpu")
    
    dataset = PersistentTextDataset(max_chars=2_000_000)  # Load up to 2M chars
    
    if len(dataset) == 0:
        logger.error("No valid training data available")
        raise ValueError("Insufficient training data")
    
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    # Step 4: Initialize or load model
    if progress_callback:
        progress_callback(40, "Initializing neural model...")
    
    model = ImprovedCharModel().to(device)
    
    # Try to load existing checkpoint to continue training
    repo = get_repository()
    best_checkpoint = repo.get_best_checkpoint()
    
    if best_checkpoint and Path(best_checkpoint.path).exists():
        try:
            logger.info(f"Loading existing checkpoint: {best_checkpoint.path}")
            model.load_state_dict(torch.load(best_checkpoint.path, map_location=device))
            logger.info("Continuing training from existing checkpoint")
        except Exception as e:
            logger.warning(f"Could not load checkpoint: {e}")
    
    # Step 5: Train the model
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()
    
    model.train()
    training_stats = {
        "epochs": epochs,
        "total_steps": 0,
        "final_loss": 0,
        "corpus_id": corpus_id,
        "dataset_size": len(dataset),
        "device": str(device)
    }
    
    total_steps = min(len(dataloader) * epochs, block_size // batch_size)
    current_step = 0
    
    for epoch in range(epochs):
        epoch_loss = 0
        batch_count = 0
        
        for batch_idx, (x, y) in enumerate(dataloader):
            x, y = x.to(device), y.to(device)
            
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            
            optimizer.step()
            
            epoch_loss += loss.item()
            batch_count += 1
            current_step += 1
            training_stats["total_steps"] += 1
            
            # Progress update
            if progress_callback:
                progress = 40 + int(50 * current_step / total_steps)
                progress_callback(
                    min(progress, 90),
                    f"Epoch {epoch+1}/{epochs}, Batch {batch_idx+1}/{len(dataloader)}, Loss: {loss.item():.4f}"
                )
            
            # Stop if we've processed enough steps
            if current_step >= total_steps:
                break
        
        avg_loss = epoch_loss / max(1, batch_count)
        training_stats["final_loss"] = avg_loss
        
        logger.info(f"Epoch {epoch+1}/{epochs} - Avg Loss: {avg_loss:.4f}")
        
        if current_step >= total_steps:
            break
    
    # Step 6: Save checkpoint
    if progress_callback:
        progress_callback(95, "Saving model checkpoint...")
    
    checkpoint_dir = Path(__file__).resolve().parent.parent / "cache" / "checkpoints"
    checkpoint_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    checkpoint_path = checkpoint_dir / f"model_{timestamp}.pt"
    
    torch.save(model.state_dict(), checkpoint_path)
    
    # Save checkpoint record to database
    checkpoint = repo.create_checkpoint(
        epochs=epochs,
        block_size=block_size,
        path=str(checkpoint_path),
        loss=training_stats["final_loss"],
        accuracy=None,  # Calculate if needed
        notes=f"Trained on corpus {corpus_id}, {training_stats['total_steps']} steps",
        is_best=True  # Mark as best for now
    )
    
    logger.info(f"Saved checkpoint: {checkpoint_path}")
    
    # Step 7: Calculate and save training metrics
    if progress_callback:
        progress_callback(98, "Recording metrics...")
    
    repo.record_accuracy(
        metric_type="training_loss",
        value=training_stats["final_loss"],
        metadata=training_stats,
        checkpoint_id=checkpoint.id
    )
    
    # Step 8: Run Monte Carlo evaluation after training completes
    if progress_callback:
        progress_callback(99, "Running Monte Carlo evaluation...")
    
    try:
        evaluation_result = run_monte_carlo_evaluation(
            num_simulations=100,  # Run 100 samples for post-training evaluation
            max_tokens=200,
            temperature=0.8,
            neural_weight=0.5,
            bigram_weight=0.2,
            trigram_weight=0.3,
            tetragram_weight=0.5,
            training_job_id=str(checkpoint.id)
        )
        
        if evaluation_result:
            logger.info(f"Monte Carlo evaluation complete: {evaluation_result['mean_validity']:.1f}% mean validity")
            training_stats["monte_carlo_evaluation"] = {
                "mean_validity": evaluation_result["mean_validity"],
                "std_deviation": evaluation_result["std_deviation"]
            }
    except Exception as e:
        logger.error(f"Failed to run Monte Carlo evaluation: {e}")
        # Don't fail the training if evaluation fails
    
    if progress_callback:
        progress_callback(100, "Training complete!")
    
    return str(checkpoint_path), training_stats


def get_training_statistics() -> dict:
    """Get comprehensive training statistics"""
    repo = get_repository()
    
    # Get corpus stats
    corpus_stats = repo.get_corpus_stats()
    
    # Get checkpoint info
    checkpoints = repo.list_checkpoints(limit=10)
    best_checkpoint = repo.get_best_checkpoint()
    
    # Get accuracy metrics
    metrics = repo.get_accuracy_summary()
    
    return {
        "corpus": corpus_stats,
        "checkpoints": {
            "total": len(checkpoints),
            "best": {
                "path": best_checkpoint.path if best_checkpoint else None,
                "loss": best_checkpoint.loss if best_checkpoint else None,
                "epochs": best_checkpoint.epochs if best_checkpoint else None
            },
            "recent": [
                {
                    "id": c.id,
                    "epochs": c.epochs,
                    "loss": c.loss,
                    "created_at": c.created_at.isoformat() if c.created_at else None
                }
                for c in checkpoints[:5]
            ]
        },
        "metrics": metrics
    }
