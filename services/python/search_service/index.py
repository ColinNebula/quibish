"""Per-user in-memory vector index. A user can only ever search documents they indexed."""
from dataclasses import dataclass, field
from threading import Lock

import numpy as np

from .embedder import get_embedder

MAX_DOCS_PER_USER = 20000
MAX_TEXT = 4000


@dataclass
class _UserIndex:
    ids: list = field(default_factory=list)
    meta: dict = field(default_factory=dict)
    vecs: list = field(default_factory=list)


class SearchIndex:
    def __init__(self, embedder=None):
        self.embedder = embedder or get_embedder()
        self._users: dict[str, _UserIndex] = {}
        self._lock = Lock()

    def upsert(self, user_id: str, doc_id: str, text: str, conversation_id: str | None = None, ts: str | None = None):
        text = text[:MAX_TEXT]
        vec = self.embedder.embed(text)
        with self._lock:
            u = self._users.setdefault(user_id, _UserIndex())
            if doc_id in u.meta:
                i = u.ids.index(doc_id)
                u.vecs[i] = vec
            else:
                if len(u.ids) >= MAX_DOCS_PER_USER:
                    old = u.ids.pop(0)
                    u.vecs.pop(0)
                    u.meta.pop(old, None)
                u.ids.append(doc_id)
                u.vecs.append(vec)
            u.meta[doc_id] = {"text": text, "conversationId": conversation_id, "timestamp": ts}

    def delete(self, user_id: str, doc_id: str) -> bool:
        with self._lock:
            u = self._users.get(user_id)
            if not u or doc_id not in u.meta:
                return False
            i = u.ids.index(doc_id)
            u.ids.pop(i)
            u.vecs.pop(i)
            u.meta.pop(doc_id)
            return True

    def clear(self, user_id: str):
        with self._lock:
            self._users.pop(user_id, None)

    def count(self, user_id: str) -> int:
        u = self._users.get(user_id)
        return len(u.ids) if u else 0

    def search(self, user_id: str, query: str, limit: int = 10, conversation_id: str | None = None, min_score: float = 0.12):
        with self._lock:
            u = self._users.get(user_id)
            if not u or not u.ids:
                return []
            ids, mat = list(u.ids), np.vstack(u.vecs)
            meta = dict(u.meta)
        scores = mat @ self.embedder.embed(query)
        q = query.lower().strip()
        out = []
        for i in np.argsort(-scores):
            m = meta[ids[i]]
            if conversation_id and m["conversationId"] != conversation_id:
                continue
            score = float(scores[i]) + (0.25 if q and q in m["text"].lower() else 0.0)
            if score < min_score:
                continue
            out.append({"id": ids[i], "score": round(score, 4), **m})
            if len(out) >= limit * 3:
                break
        out.sort(key=lambda r: -r["score"])
        return out[:limit]