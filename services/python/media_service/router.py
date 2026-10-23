from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile

from common.auth import current_user
from . import processing as P

router = APIRouter(prefix="/media", tags=["media"])


async def _read(file: UploadFile) -> bytes:
    data = await file.read(P.MAX_BYTES + 1)
    if len(data) > P.MAX_BYTES:
        raise HTTPException(413, "file too large")
    return data


def _guard(fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except P.MediaError as e:
        raise HTTPException(422, str(e))


@router.post("/image/inspect")
async def inspect_image(file: UploadFile = File(...), user=Depends(current_user)):
    r = _guard(P.inspect, await _read(file))
    return r.__dict__


@router.post("/image/optimize")
async def optimize_image(file: UploadFile = File(...), max_side: int = Query(1920, ge=64, le=4096),
                         quality: int = Query(85, ge=30, le=95), fmt: str = Query("webp"), user=Depends(current_user)):
    body, mime, report = _guard(P.optimize, await _read(file), max_side, quality, fmt)
    return Response(body, media_type=mime, headers={
        "X-Original-Format": report.format, "X-Had-Exif": str(report.had_exif).lower(),
        "X-Had-Gps": str(report.had_gps).lower()})


@router.post("/image/thumbnail")
async def make_thumbnail(file: UploadFile = File(...), size: int = Query(320, ge=32, le=1024),
                         fmt: str = Query("webp"), user=Depends(current_user)):
    body, mime = _guard(P.thumbnail, await _read(file), size, fmt)
    return Response(body, media_type=mime)