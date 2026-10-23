import time

import jwt
import pytest
from fastapi.testclient import TestClient

from .settings import JWT_SECRET


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("JWT_SECRET", JWT_SECRET)
    from main import app
    from search_service.router import index
    index._users.clear()
    return TestClient(app)


def auth(uid):
    now = int(time.time())
    t = jwt.encode({"id": uid, "username": uid, "iat": now, "exp": now + 600, "iss": "quibish-app", "aud": "quibish-users"},
                   JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {t}"}


def test_requires_auth(client):
    assert client.get("/search", params={"q": "x"}).status_code == 401
    assert client.get("/search", params={"q": "x"}, headers={"Authorization": "Bearer bad"}).status_code == 403


def test_finds_relevant_message_first(client):
    h = auth("u1")
    docs = [{"id": "1", "text": "Lets grab lunch at the new pizza place tomorrow"},
            {"id": "2", "text": "The quarterly budget report is due on Friday"},
            {"id": "3", "text": "Happy birthday! Hope you have a great day"}]
    assert client.post("/search/index/bulk", json={"docs": docs}, headers=h).json()["indexed"] == 3
    r = client.get("/search", params={"q": "pizza lunch"}, headers=h).json()["results"]
    assert r and r[0]["id"] == "1"
    r = client.get("/search", params={"q": "budjet reprot"}, headers=h).json()["results"]
    assert r and r[0]["id"] == "2", "typo tolerance"


def test_users_cannot_see_each_others_documents(client):
    client.post("/search/index", json={"id": "s", "text": "my secret plan"}, headers=auth("alice"))
    assert client.get("/search", params={"q": "secret plan"}, headers=auth("bob")).json()["results"] == []
    assert client.get("/search", params={"q": "secret plan"}, headers=auth("alice")).json()["results"]


def test_conversation_filter_update_and_delete(client):
    h = auth("u1")
    client.post("/search/index", json={"id": "a", "text": "meeting notes", "conversationId": "c1"}, headers=h)
    client.post("/search/index", json={"id": "b", "text": "meeting agenda", "conversationId": "c2"}, headers=h)
    r = client.get("/search", params={"q": "meeting", "conversationId": "c2"}, headers=h).json()["results"]
    assert [x["id"] for x in r] == ["b"]
    client.post("/search/index", json={"id": "a", "text": "lunch plans", "conversationId": "c1"}, headers=h)
    assert client.get("/search", params={"q": "meeting notes"}, headers=h).json()["results"][0]["id"] != "a"
    assert client.delete("/search/index/b", headers=h).status_code == 200
    assert client.delete("/search/index/b", headers=h).status_code == 404