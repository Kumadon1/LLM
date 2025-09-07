"""Neural training service – defines model, dataset, and train() helper.
This is a _minimal_ reference implementation that can train on cleaned
characters stored in markov_ngrams or any raw string.  The heavy lifting
(CNN+BiLSTM+Attention) is included but size-reduced so it runs on CPU if
no GPU is present.
"""
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Callable

import logging
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sqlalchemy import text

from backend.core.database import SessionLocal
from backend.models.neural import NeuralCheckpoint

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
VOCAB = "ABCDEFGHIJKLMNOPQRSTUVWXYZ "
CHAR2IDX = {c: i for i, c in enumerate(VOCAB)}
IDX2CHAR = {i: c for c, i in CHAR2IDX.items()}
VOCAB_SIZE = len(VOCAB)
SEQ_LEN = 11  # context window

# ---------------------------------------------------------------------------
# Dataset pulling characters from DB (very naive sequential sampling)
# ---------------------------------------------------------------------------
class CharDBDataset(Dataset):
    def __init__(self):
        self.buffer: List[int] = []
        logger = logging.getLogger(__name__)
        try:
            with SessionLocal() as s:
                # Load from text_corpus table instead of markov_ngrams
                res = s.execute(text("SELECT content FROM text_corpus ORDER BY created_at DESC LIMIT 100"))
                for (content,) in res:
                    # Clean text and convert to indices
                    cleaned = ''.join(c for c in content.upper() if c in VOCAB)
                    for ch in cleaned:
                        if ch in CHAR2IDX:
                            self.buffer.append(CHAR2IDX[ch])
        except Exception as e:
            logger.exception("Failed reading text_corpus for dataset: %s", e)
        # Ensure enough length so training loop works
        if len(self.buffer) < 10000:
            # Fallback synthetic data from a simple pangram
            seed = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG " * 400
            self.buffer.extend([CHAR2IDX.get(ch, 0) for ch in seed])

    def __len__(self):
        return len(self.buffer) - SEQ_LEN

    def __getitem__(self, idx):
        x = torch.tensor(self.buffer[idx : idx + SEQ_LEN], dtype=torch.long)
        y = torch.tensor(self.buffer[idx + SEQ_LEN], dtype=torch.long)
        return x, y

# ---------------------------------------------------------------------------
# Model architecture (Embedding → 1 CNN → 1 BiLSTM → 2-head Attention → FF)
# ---------------------------------------------------------------------------
class HybridCharModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.embed = nn.Embedding(VOCAB_SIZE, 32)
        self.cnn = nn.Conv1d(32, 64, kernel_size=3, padding=1)
        self.lstm = nn.LSTM(64, 256, num_layers=2, batch_first=True, bidirectional=True)
        self.att_q = nn.Linear(512, 512)
        self.att_k = nn.Linear(512, 512)
        self.att_v = nn.Linear(512, 512)
        self.ff = nn.Sequential(
            nn.Linear(512, 512),
            nn.ReLU(),
            nn.Dropout(0.25),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Linear(256, VOCAB_SIZE),
        )

    def forward(self, x):
        x = self.embed(x)  # (B, L, 32)
        x = x.transpose(1, 2)  # (B, 32, L)
        x = self.cnn(x).transpose(1, 2)  # (B, L, 64)
        out, _ = self.lstm(x)  # (B, L, 512)
        # Simple 2-head attention (split dim)
        q = self.att_q(out)
        k = self.att_k(out)
        v = self.att_v(out)
        attn_scores = torch.softmax((q @ k.transpose(1, 2)) / (512 ** 0.5), dim=-1)
        out = attn_scores @ v  # (B, L, 512)
        # Use last timestep
        out = out[:, -1, :]
        logits = self.ff(out)
        return logits

# ---------------------------------------------------------------------------
# Training helper
# ---------------------------------------------------------------------------

def train(block_size: int = 100_000, epochs: int = 5, batch_size: int = 32, progress_cb: Optional[Callable[[int, str], None]] = None):
    logger = logging.getLogger(__name__)
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    dataset = CharDBDataset()
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    logger.info("Neural train: device=%s, dataset_len=%d, block_size=%d, epochs=%d", device, len(dataset), block_size, epochs)

    model = HybridCharModel().to(device)
    optim = torch.optim.AdamW(model.parameters(), lr=1e-3)
    criterion = nn.CrossEntropyLoss()

    total_steps_target = min(block_size, epochs * max(1, len(loader)))
    processed_steps = 0

    global_step = 0
    for epoch in range(epochs):
        epoch_loss = 0.0
        for x, y in loader:
            x, y = x.to(device), y.to(device)
            optim.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optim.step()
            epoch_loss += loss.item()
            global_step += 1
            processed_steps += 1
            if progress_cb and total_steps_target:
                pct = int(100 * processed_steps / total_steps_target)
                progress_cb(min(pct, 99), f"epoch {epoch+1} step {processed_steps}")
            if global_step >= block_size:
                break
        logger.info("Epoch %d/%d loss=%.4f", epoch + 1, epochs, epoch_loss / max(1, len(loader)))
        if global_step >= block_size:
            break

    # Save checkpoint
    ckpt_dir = Path(__file__).resolve().parent.parent / "cache" / "checkpoints"
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = ckpt_dir / f"model_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pt"
    torch.save(model.state_dict(), ckpt_path)

    with SessionLocal() as s:
        s.add(
            NeuralCheckpoint(
                epochs=epoch + 1,
                block_size=block_size,
                path=str(ckpt_path),
                notes=f"loss={epoch_loss/max(1,len(loader)):.4f}"
            )
        )
        s.commit()

    if progress_cb:
        progress_cb(100, "done")

    return ckpt_path

