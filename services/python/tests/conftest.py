"""Boots the real Node backend on a free port and exposes login/WebSocket helpers."""
import json
import os
import socket
import subprocess
import time
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
import websockets

BACKEND = Path(__file__).resolve().parents[3] / "backend"
from .settings import JWT_SECRET


def _free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


@pytest.fixture(scope="session")
def server():
    external = os.environ.get("QUIBISH_URL")
    if external:
        host = external.rstrip("/")
        yield {"http": host, "ws": host.replace("http", "ws", 1) + "/ws", "secret": os.environ.get("JWT_SECRET", "")}
        return
    port = _free_port()
    env = {**os.environ, "PORT": str(port), "JWT_SECRET": JWT_SECRET, "NODE_ENV": "development"}
    proc = subprocess.Popen(["node", "stable-server.js"], cwd=BACKEND, env=env,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    base = f"http://127.0.0.1:{port}"
    deadline = time.time() + 40
    while time.time() < deadline:
        try:
            if httpx.get(f"{base}/api/health", timeout=1).status_code < 500:
                break
        except httpx.HTTPError:
            time.sleep(0.4)
    else:
        proc.kill()
        pytest.fail("backend did not start")
    yield {"http": base, "ws": f"ws://127.0.0.1:{port}/ws", "secret": JWT_SECRET}
    proc.terminate()
    try:
        proc.wait(10)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(scope="session")
def users(server):
    out = {}
    for name, pw in (("john", "password"), ("jane", "password"), ("demo", "demo")):
        r = httpx.post(f"{server['http']}/api/auth/login", json={"username": name, "password": pw}, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        out[name] = {"token": body["token"], "id": str(body["user"]["id"]), "name": name}
    return out


class Client:
    def __init__(self, ws):
        self.ws = ws
        self.inbox: list[dict] = []

    async def send(self, **payload):
        await self.ws.send(json.dumps(payload))

    async def pump(self, seconds: float = 0.5):
        import asyncio
        end = time.time() + seconds
        while time.time() < end:
            try:
                raw = await asyncio.wait_for(self.ws.recv(), timeout=max(0.05, end - time.time()))
                self.inbox.append(json.loads(raw))
            except (asyncio.TimeoutError, websockets.ConnectionClosed):
                break

    def of(self, type_: str):
        return [m for m in self.inbox if m.get("type") == type_]


@pytest_asyncio.fixture
async def connect(server):
    opened: list = []

    async def _connect(token=None, **extra):
        ws = await websockets.connect(server["ws"])
        c = Client(ws)
        opened.append(ws)
        if token is not None or extra:
            await c.send(type="join", token=token, **extra)
            await c.pump(0.4)
        return c

    yield _connect
    for ws in opened:
        await ws.close()