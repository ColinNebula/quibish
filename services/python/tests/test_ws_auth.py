import time

import jwt
import pytest
import websockets

from .settings import JWT_SECRET


def _sign(user_id, secret=JWT_SECRET, **over):
    claims = {"id": user_id, "username": "x", "iat": int(time.time()), "exp": int(time.time()) + 600,
              "iss": "quibish-app", "aud": "quibish-users"}
    claims.update(over)
    return jwt.encode(claims, secret, algorithm="HS256")


async def test_valid_token_joins_as_token_identity(connect, users):
    c = await connect(users["john"]["token"], userId="999", username="fake")
    joined = c.of("joined")
    assert joined and joined[0]["userId"] == users["john"]["id"]


@pytest.mark.parametrize("label,token", [
    ("missing", None),
    ("garbage", "a.b.c"),
    ("wrong secret", _sign("2", secret="another-secret-another-secret-12345")),
    ("expired", _sign("2", exp=int(time.time()) - 30)),
    ("wrong audience", _sign("2", aud="someone-else")),
    ("wrong issuer", _sign("2", iss="evil")),
])
async def test_bad_tokens_are_rejected(connect, label, token):
    c = await connect(token, userId="2")
    assert c.of("join-error"), label
    assert not c.of("joined"), label
    await c.pump(0.3)
    with pytest.raises(websockets.ConnectionClosed) as exc:
        await c.ws.recv()
    assert exc.value.rcvd.code == 4401


async def test_unauthenticated_socket_cannot_send_messages(connect, users):
    anon = await connect()
    victim = await connect(users["jane"]["token"])
    await anon.send(type="message", text="spoof", recipientId=users["jane"]["id"], clientId="s1")
    await victim.pump(0.5)
    assert not victim.of("message")


async def test_second_join_replaces_first_socket(connect, users):
    first = await connect(users["demo"]["token"])
    second = await connect(users["demo"]["token"])
    await first.pump(0.5)
    with pytest.raises(websockets.ConnectionClosed):
        await first.ws.recv()
    assert second.of("joined")