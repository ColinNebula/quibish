from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from common.auth import current_user
from .index import SearchIndex

router = APIRouter(prefix="/search", tags=["search"])
index = SearchIndex()


class Doc(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=4000)
    conversationId: str | None = None
    timestamp: str | None = None


class BulkDocs(BaseModel):
    docs: list[Doc] = Field(max_length=2000)


def _uid(user: dict) -> str:
    return str(user["id"])


@router.post("/index", status_code=204)
def index_doc(doc: Doc, user=Depends(current_user)):
    index.upsert(_uid(user), doc.id, doc.text, doc.conversationId, doc.timestamp)


@router.post("/index/bulk")
def index_bulk(body: BulkDocs, user=Depends(current_user)):
    for d in body.docs:
        index.upsert(_uid(user), d.id, d.text, d.conversationId, d.timestamp)
    return {"indexed": len(body.docs), "total": index.count(_uid(user))}


@router.delete("/index/{doc_id}")
def delete_doc(doc_id: str, user=Depends(current_user)):
    if not index.delete(_uid(user), doc_id):
        raise HTTPException(404, "not found")
    return {"deleted": doc_id}


@router.delete("/index", status_code=204)
def clear(user=Depends(current_user)):
    index.clear(_uid(user))


@router.get("")
def search(q: str = Query(min_length=1, max_length=200), limit: int = Query(10, ge=1, le=50),
           conversationId: str | None = None, user=Depends(current_user)):
    return {"query": q, "results": index.search(_uid(user), q, limit, conversationId)}