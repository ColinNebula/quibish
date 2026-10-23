"""Optional companion service for Quibish. Run: uvicorn main:app --port 8000"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from media_service.router import router as media_router
from search_service.router import router as search_router

app = FastAPI(title="Quibish Python services")

origins = [o.strip() for o in os.getenv("QUIBISH_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["Authorization", "Content-Type"])
app.include_router(search_router)
app.include_router(media_router)


@app.get("/health")
def health():
    return {"ok": True}