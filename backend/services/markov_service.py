"""Service for extracting and persisting Markov n-gram counts.

Usage:
    from backend.services.markov_service import process_text_block
    process_text_block(text, session)
"""
from collections import Counter, defaultdict
from typing import Dict, Iterable, List

import logging
from sqlalchemy.dialects.sqlite import insert as sqlite_upsert

from backend.models.markov import MarkovNGram
from backend.core.database import SessionLocal

ALLOWED_CHARS = set("ABCDEFGHIJKLMNOPQRSTUVWXYZ ")
# To avoid SQLite's ~999-parameter limit we chunk UPSERTs.
UPSERT_CHUNK_ROWS = 200  # 200 rows * 4 params/row = 800 params < 999


def _clean_text(raw: str) -> str:
    """Upper-case and keep only A-Z and space."""
    return "".join(ch for ch in raw.upper() if ch in ALLOWED_CHARS)


def _extract_ngrams(text: str, n_values: Iterable[int] = (2, 3, 4)) -> Dict[int, Counter]:
    """Return dict of n → Counter({(context,next): count})."""
    ngram_counts: Dict[int, Counter] = {n: Counter() for n in n_values}
    for n in n_values:
        if len(text) < n:
            continue
        for i in range(len(text) - n + 1):
            chunk = text[i : i + n]
            context, next_char = chunk[:-1], chunk[-1]
            ngram_counts[n][(context, next_char)] += 1
    return ngram_counts


def process_text(raw_text: str, block_size: int = 100_000) -> None:
    """Process the entire text by slicing into blocks and calling process_text_block."""
    logger = logging.getLogger(__name__)
    text_len = len(raw_text)
    if text_len <= block_size:
        process_text_block(raw_text)
        return
    start = 0
    block_idx = 0
    while start < text_len:
        end = min(start + block_size, text_len)
        block = raw_text[start:end]
        logger.info("Processing block %d (%d..%d / %d)", block_idx + 1, start, end, text_len)
        process_text_block(block)
        block_idx += 1
        start = end


def process_text_block(raw_text: str) -> None:
    """Clean text, extract 2-4-gram counts and upsert into DB.
    This function is designed to handle a single block (e.g., 100k chars).
    """
    logger = logging.getLogger(__name__)
    cleaned = _clean_text(raw_text)
    ngram_counts = _extract_ngrams(cleaned)

    logger.info(
        "Markov: cleaned_len=%d bigrams=%d trigrams=%d tetragrams=%d",
        len(cleaned), len(ngram_counts.get(2, {})), len(ngram_counts.get(3, {})), len(ngram_counts.get(4, {})),
    )

    with SessionLocal() as session:
        for n, counter in ngram_counts.items():
            if not counter:
                continue
            rows = [
                {
                    "n": n,
                    "context": context,
                    "next_char": next_char,
                    "count": count,
                }
                for (context, next_char), count in counter.items()
            ]
            # Chunk UPSERTS to avoid SQLite variable limit (~999 params)
            for i in range(0, len(rows), UPSERT_CHUNK_ROWS):
                part = rows[i : i + UPSERT_CHUNK_ROWS]
                stmt = sqlite_upsert(MarkovNGram).values(part)
                stmt = stmt.on_conflict_do_update(
                    index_elements=[MarkovNGram.n, MarkovNGram.context, MarkovNGram.next_char],
                    set_={"count": MarkovNGram.count + stmt.excluded.count},
                )
                session.execute(stmt)
        session.commit()
    logger.info("Markov: upsert complete")

