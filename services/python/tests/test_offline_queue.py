import uuid


async def test_messages_for_offline_user_are_replayed_once_in_order(connect, users):
    a = await connect(users["john"]["token"])
    tag = uuid.uuid4().hex[:6]
    for i in range(3):
        await a.send(type="message", text=f"{tag}-{i}", recipientId=users["jane"]["id"], clientId=f"{tag}{i}")
    await a.pump(0.5)
    assert [m["delivered"] for m in a.of("message-sent")][-3:] == [False, False, False]

    b = await connect(users["jane"]["token"])
    await b.pump(0.5)
    texts = [m["text"] for m in b.of("message") if m["text"].startswith(tag)]
    assert texts == [f"{tag}-0", f"{tag}-1", f"{tag}-2"]
    assert any(n["notification"]["data"]["senderId"] == users["john"]["id"] for n in b.of("notification"))

    await a.pump(0.5)
    delivered = {m["clientId"] for m in a.of("message-delivered")}
    assert {f"{tag}0", f"{tag}1", f"{tag}2"} <= delivered

    b2 = await connect(users["jane"]["token"])
    await b2.pump(0.5)
    assert not [m for m in b2.of("message") if m["text"].startswith(tag)], "queue replayed twice"


async def test_queue_is_per_recipient(connect, users):
    a = await connect(users["john"]["token"])
    tag = uuid.uuid4().hex[:6]
    await a.send(type="message", text=f"{tag}-for-jane", recipientId=users["jane"]["id"], clientId=tag)
    await a.pump(0.3)
    other = await connect(users["demo"]["token"])
    await other.pump(0.5)
    assert not [m for m in other.of("message") if tag in m["text"]]
    jane = await connect(users["jane"]["token"])
    await jane.pump(0.5)
    assert [m for m in jane.of("message") if tag in m["text"]]


async def test_queue_is_capped_at_500(connect, users):
    a = await connect(users["john"]["token"])
    tag = uuid.uuid4().hex[:6]
    for i in range(510):
        await a.send(type="message", text=f"{tag}-{i}", recipientId=users["demo"]["id"], clientId=f"{tag}{i}")
    await a.pump(2.0)
    demo = await connect(users["demo"]["token"])
    await demo.pump(1.5)
    mine = [m["text"] for m in demo.of("message") if m["text"].startswith(tag)]
    assert len(mine) == 500
    assert mine[0] == f"{tag}-10" and mine[-1] == f"{tag}-509"