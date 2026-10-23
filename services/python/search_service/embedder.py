"""Text embedders. The default needs no model download; a neural one is used when available.

HashingEmbedder: word unigrams/bigrams + character trigrams hashed into a fixed vector. It gives
typo-tolerant, partial-word and phrase-aware matching, but it is NOT truly semantic (it won't
link "car" to "automobile"). Set QUIBISH_EMBEDDER=sbert (pip install sentence-transformers) for that.
"""
import hashlib
import os
import re

import numpy as np

DIM = 1024
_WORD = re.compile(r"[\w']+", re.UNICODE)


def _h(token: str) -> int:
    return int.from_bytes(hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest(), "big")


class HashingEmbedder:
    dim = DIM

    def embed(self, text: str) -> np.ndarray:
        v = np.zeros(DIM, dtype=np.float32)
        words = _WORD.findall(text.lower())
        feats = [(w, 1.0) for w in words]
        feats += [(a + " " + b, 0.8) for a, b in zip(words, words[1:])]
        for w in words:
            padded = f"#{w}#"
            feats += [(padded[i:i + 3], 1.0) for i in range(len(padded) - 2)]
        for tok, weight in feats:
            h = _h(tok)
            v[h % DIM] += weight if (h >> 40) & 1 else -weight
        n = np.linalg.norm(v)
        return v / n if n else v


class SbertEmbedder:
    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(os.environ.get("QUIBISH_SBERT_MODEL", "all-MiniLM-L6-v2"))
        self.dim = self.model.get_sentence_embedding_dimension()

    def embed(self, text: str) -> np.ndarray:
        return self.model.encode(text, normalize_embeddings=True).astype(np.float32)


def get_embedder():
    if os.environ.get("QUIBISH_EMBEDDER") == "sbert":
        return SbertEmbedder()
    return HashingEmbedder()