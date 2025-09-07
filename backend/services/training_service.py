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

from db.repository_orm import get_repository
from services.markov_service import process_text_block
from services.evaluation_service import run_monte_carlo_evaluation

logger = logging.getLogger(__name__)

# Character vocabulary
VOCAB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ "
CHAR2IDX = {c: i for i, c in enumerate(VOCAB)}
IDX2CHAR = {i: c for c, i in CHAR2IDX.items()}
VOCAB_SIZE = len(VOCAB)
SEQ_LEN = 11  # context window


class BlockTextDataset(Dataset):
    """Dataset for training on a single text block"""
    
    def __init__(self, text_block: str):
        """
        Initialize dataset from a single text block
        
        Args:
            text_block: The text block to train on
        """
        self.data = []
        
        # Clean and convert text to indices
        cleaned_text = self._clean_text(text_block)
        for char in cleaned_text:
            if char in CHAR2IDX:
                self.data.append(CHAR2IDX[char])
        
        logger.info(f"Created dataset with {len(self.data)} characters")
        
        # If we don't have enough data for even one sample, pad with spaces
        if len(self.data) < SEQ_LEN + 1:
            logger.warning(f"Block too small ({len(self.data)} chars), padding with spaces")
            while len(self.data) < SEQ_LEN + 1:
                self.data.append(CHAR2IDX[' '])
    
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


# Removed persist_training_text - we don't want to accumulate text in database


def train_with_persistence(
    text: str,
    block_size: int = 100_000,
    epochs: int = 5,
    batch_size: int = 32,
    learning_rate: float = 1e-3,
    progress_callback: Optional[Callable[[int, str], None]] = None
) -> Tuple[str, dict]:
    """
    Train the neural model block by block
    
    Args:
        text: Text to train on (will be processed in blocks)
        block_size: Size of each training block in characters
        epochs: Number of training epochs PER BLOCK
        batch_size: Batch size for training
        learning_rate: Learning rate for optimizer
        progress_callback: Optional callback for progress updates
    
    Returns:
        Tuple of (checkpoint_path, training_stats)
    """
    logger.info(f"Starting block-by-block training: {len(text)} chars, block_size={block_size}, epochs={epochs}")
    
    # Initialize device
    device = torch.device("cuda" if torch.cuda.is_available() else 
                         "mps" if torch.backends.mps.is_available() else "cpu")
    logger.info(f"Using device: {device}")
    
    # Initialize or load model
    if progress_callback:
        progress_callback(5, "Initializing neural model...")
    
    model = ImprovedCharModel().to(device)
    repo = get_repository()
    
    # Try to load existing checkpoint to continue training
    best_checkpoint = repo.get_best_checkpoint()
    if best_checkpoint and Path(best_checkpoint.path).exists():
        try:
            logger.info(f"Loading existing checkpoint: {best_checkpoint.path}")
            model.load_state_dict(torch.load(best_checkpoint.path, map_location=device))
            logger.info("Continuing training from existing checkpoint")
        except Exception as e:
            logger.warning(f"Could not load checkpoint: {e}")
    
    # Initialize optimizer and criterion
    optimizer = torch.optim.AdamW(model.parameters(), lr=learning_rate)
    criterion = nn.CrossEntropyLoss()
    
    # Calculate number of blocks
    text_len = len(text)
    num_blocks = (text_len + block_size - 1) // block_size  # Ceiling division
    
    logger.info(f"Processing {num_blocks} blocks of up to {block_size} characters each")
    
    # Training statistics
    training_stats = {
        "epochs_per_block": epochs,
        "total_blocks": num_blocks,
        "total_steps": 0,
        "block_losses": [],
        "final_loss": 0,
        "device": str(device),
        "text_length": text_len
    }
    
    # Process each block sequentially
    processed = 0
    for block_idx in range(num_blocks):
        # Extract current block
        block_start = block_idx * block_size
        block_end = min(block_start + block_size, text_len)
        text_block = text[block_start:block_end]
        
        logger.info(f"\nProcessing Block {block_idx + 1}/{num_blocks}: {len(text_block)} characters")
        
        if progress_callback:
            base_progress = int(90 * block_idx / num_blocks)
            progress_callback(base_progress, f"Processing block {block_idx + 1}/{num_blocks}...")
        
        # Step 1: Extract Markov chains from this block
        logger.info(f"Extracting Markov chains from block {block_idx + 1}")
        process_text_block(text_block)
        
        # Step 2: Create dataset for this block
        block_dataset = BlockTextDataset(text_block)
        
        if len(block_dataset) == 0:
            logger.warning(f"Block {block_idx + 1} has no valid training samples, skipping")
            continue
        
        block_dataloader = DataLoader(block_dataset, batch_size=batch_size, shuffle=True)
        
        # Step 3: Train neural network on this block for specified epochs
        model.train()
        block_total_loss = 0
        block_step_count = 0
        
        for epoch in range(epochs):
            epoch_loss = 0
            batch_count = 0
            
            for batch_idx, (x, y) in enumerate(block_dataloader):
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
                block_step_count += 1
                training_stats["total_steps"] += 1
                
                # Progress update
                if progress_callback and batch_count % 10 == 0:
                    block_progress = base_progress + int(90 * (block_idx + (epoch + 1) / epochs) / num_blocks)
                    progress_callback(
                        min(block_progress, 90),
                        f"Block {block_idx+1}/{num_blocks}, Epoch {epoch+1}/{epochs}, Batch {batch_idx+1}/{len(block_dataloader)}, Loss: {loss.item():.4f}"
                    )
            
            if batch_count > 0:
                avg_epoch_loss = epoch_loss / batch_count
                block_total_loss += avg_epoch_loss
                logger.info(f"Block {block_idx+1}, Epoch {epoch+1}/{epochs} - Avg Loss: {avg_epoch_loss:.4f}")
        
        # Record block statistics
        if block_step_count > 0:
            avg_block_loss = block_total_loss / epochs
            training_stats["block_losses"].append(avg_block_loss)
            logger.info(f"Block {block_idx+1} complete - Avg Loss across epochs: {avg_block_loss:.4f}")
        
        processed = block_end
    
    # Calculate final statistics
    if training_stats["block_losses"]:
        training_stats["final_loss"] = sum(training_stats["block_losses"]) / len(training_stats["block_losses"])
    
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
        epochs=epochs * num_blocks,  # Total epochs across all blocks
        block_size=block_size,
        path=str(checkpoint_path),
        loss=training_stats["final_loss"],
        accuracy=None,  # Calculate if needed
        notes=f"Trained on {num_blocks} blocks, {training_stats['total_steps']} steps, {epochs} epochs per block",
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
