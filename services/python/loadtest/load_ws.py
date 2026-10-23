"""Opens N authenticated sockets, sends M messages each in a ring, and reports delivery/latency.

    python loadtest/load_ws.py --url http://localhost:5001 --users 200 --messages 20
Requires accounts john/jane/demo (seeded demo users); tokens are reused across sockets, so the
server's "second join replaces first" rule is avoided by minting a signed token per virtual user
when --secret (the backend JWT_SECRET) is supplied.
"""
import argparse
import asyncio
import json
import statistics
import time

import httpx
import jwt
import websockets


def mint(secret: str, uid: str) -> str:
    now = int(time.time())
    return jwt.encode({"id": uid, "username": f"load{uid}", "iat": now, "exp": now + 3600,
                       "iss": "quibish-app", "aud": "quibish-users"}, secret, algorithm="HS256")


async def virtual_user(ws_url, secret, idx, total, n_messages, stats, ready, go):
    uid = f"load{idx}"
    peer = f"load{(idx + 1) % total}"
    async with websockets.connect(ws_url, max_size=2**20) as ws:
        await ws.send(json.dumps({"type": "join", "token": mint(secret, uid)}))
        async for raw in ws:
            if json.loads(raw).get("type") == "joined":
                break
        ready.append(uid)
        await go.wait()
        sent_at = {}

        async def reader():
            async for raw in ws:
                m = json.loads(raw)
                if m.get("type") == "message-sent":
                    t0 = sent_at.pop(m["clientId"], None)
                    if t0:
                        stats["ack_ms"].append((time.perf_counter() - t0) * 1000)
                        stats["acked"] += 1
                elif m.get("type") == "message":
                    stats["received"] += 1

        task = asyncio.create_task(reader())
        for i in range(n_messages):
            cid = f"{uid}-{i}"
            sent_at[cid] = time.perf_counter()
            await ws.send(json.dumps({"type": "message", "text": f"hi {i}", "recipientId": peer, "clientId": cid}))
            stats["sent"] += 1
            await asyncio.sleep(0.01)
        await asyncio.sleep(2.0)
        task.cancel()


async def main(args):
    secret = args.secret
    ws_url = args.url.replace("http", "ws", 1).rstrip("/") + "/ws"
    stats = {"sent": 0, "acked": 0, "received": 0, "ack_ms": []}
    ready, go = [], asyncio.Event()
    t0 = time.perf_counter()
    tasks = [asyncio.create_task(virtual_user(ws_url, secret, i, args.users, args.messages, stats, ready, go))
             for i in range(args.users)]
    while len(ready) < args.users and time.perf_counter() - t0 < 60:
        await asyncio.sleep(0.1)
    print(f"connected {len(ready)}/{args.users} in {time.perf_counter() - t0:.1f}s")
    start = time.perf_counter()
    go.set()
    await asyncio.gather(*tasks, return_exceptions=True)
    elapsed = time.perf_counter() - start - 2.0
    lat = sorted(stats["ack_ms"]) or [0]
    p = lambda q: lat[min(len(lat) - 1, int(len(lat) * q))]
    print(f"sent={stats['sent']} acked={stats['acked']} received={stats['received']}")
    print(f"throughput ~{stats['sent'] / max(elapsed, 0.001):.0f} msg/s")
    print(f"ack latency ms: mean={statistics.mean(lat):.1f} p50={p(.5):.1f} p95={p(.95):.1f} max={lat[-1]:.1f}")
    ok = stats["acked"] == stats["sent"] and stats["received"] == stats["sent"]
    print("RESULT:", "PASS" if ok else "FAIL (lost or undelivered messages)")
    return 0 if ok else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5001")
    ap.add_argument("--users", type=int, default=100)
    ap.add_argument("--messages", type=int, default=10)
    ap.add_argument("--secret", required=True, help="backend JWT_SECRET")
    raise SystemExit(asyncio.run(main(ap.parse_args())))