import io
import time

import jwt
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from .settings import JWT_SECRET


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", JWT_SECRET)
    from main import app
    return TestClient(app)


def auth():
    now = int(time.time())
    t = jwt.encode({"id": "1", "username": "u", "iat": now, "exp": now + 600, "iss": "quibish-app", "aud": "quibish-users"},
                   JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {t}"}


def jpeg_with_gps(size=(3000, 2000), orientation=6):
    img = Image.new("RGB", size, (200, 30, 30))
    exif = Image.Exif()
    exif[0x0112] = orientation
    gps = exif.get_ifd(0x8825)
    gps[1], gps[2], gps[3], gps[4] = "N", (40.0, 26.0, 46.0), "W", (79.0, 58.0, 56.0)
    buf = io.BytesIO()
    img.save(buf, "JPEG", exif=exif)
    return buf.getvalue()


def test_inspect_reports_gps(client):
    r = client.post("/media/image/inspect", files={"file": ("a.jpg", jpeg_with_gps())}, headers=auth())
    assert r.status_code == 200 and r.json()["had_gps"] is True


def test_optimize_strips_metadata_resizes_and_applies_rotation(client):
    r = client.post("/media/image/optimize", files={"file": ("a.jpg", jpeg_with_gps())}, headers=auth())
    assert r.status_code == 200 and r.headers["x-had-gps"] == "true"
    out = Image.open(io.BytesIO(r.content))
    assert max(out.size) <= 1920
    assert out.height > out.width, "orientation 6 should have been applied (portrait)"
    assert not out.getexif() and b"GPS" not in r.content


def test_thumbnail_is_square(client):
    r = client.post("/media/image/thumbnail?size=128", files={"file": ("a.jpg", jpeg_with_gps())}, headers=auth())
    assert Image.open(io.BytesIO(r.content)).size == (128, 128)


def test_rejects_non_images_and_oversize_and_anon(client):
    assert client.post("/media/image/optimize", files={"file": ("a.jpg", b"<script>alert(1)</script>")},
                       headers=auth()).status_code == 422
    assert client.post("/media/image/optimize", files={"file": ("a.jpg", b"0" * (11 * 1024 * 1024))},
                       headers=auth()).status_code == 413
    assert client.post("/media/image/optimize", files={"file": ("a.jpg", jpeg_with_gps())}).status_code == 401


def test_rejects_unsupported_output_format(client):
    r = client.post("/media/image/optimize?fmt=exe", files={"file": ("a.jpg", jpeg_with_gps())}, headers=auth())
    assert r.status_code == 422