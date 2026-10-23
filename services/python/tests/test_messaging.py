async def test_direct_message_reaches_only_the_recipient(connect, users):
    a = await connect(users["john"]["token"])
    b = await connect(users["jane"]["token"])
    bystander = await connect(users["demo"]["token"])
    await a.send(type="message", text="hello jane", recipientId=users["jane"]["id"], clientId="c1")
    await b.pump(0.5)
    await bystander.pump(0.3)
    await a.pump(0.3)

    got = b.of("message")
    assert [m["text"] for m in got] == ["hello jane"]
    assert got[0]["senderId"] == users["john"]["id"]
    assert not bystander.of("message"), "private message leaked to another user"
    sent = a.of("message-sent")
    assert sent and sent[0]["clientId"] == "c1" and sent[0]["delivered"] is True


async def test_sender_identity_is_server_assigned(connect, users):
    a = await connect(users["john"]["token"])
    b = await connect(users["jane"]["token"])
    await a.send(type="message", text="x", recipientId=users["jane"]["id"], clientId="c2",
                 senderId="999", senderName="Mallory")
    await b.pump(0.5)
    m = b.of("message")[0]
    assert m["senderId"] == users["john"]["id"] and m["senderName"] == "john"


async def test_invalid_messages_are_rejected(connect, users):
    a = await connect(users["john"]["token"])
    await a.send(type="message", text="no recipient", clientId="bad1")
    await a.send(type="message", text="", recipientId=users["jane"]["id"], clientId="bad2")
    await a.send(type="message", text="x" * 20001, recipientId=users["jane"]["id"], clientId="bad3")
    await a.pump(0.6)
    failed = {m["clientId"] for m in a.of("message-failed")}
    assert failed == {"bad1", "bad2", "bad3"}


async def test_message_ids_are_unique(connect, users):
    a = await connect(users["john"]["token"])
    b = await connect(users["jane"]["token"])
    for i in range(25):
        await a.send(type="message", text=f"m{i}", recipientId=users["jane"]["id"], clientId=f"u{i}")
    await b.pump(1.0)
    ids = [m["id"] for m in b.of("message")]
    assert len(ids) == 25 and len(set(ids)) == 25


async def test_typing_goes_to_recipient_with_username(connect, users):
    a = await connect(users["john"]["token"])
    b = await connect(users["jane"]["token"])
    bystander = await connect(users["demo"]["token"])
    await a.send(type="typing", recipientId=users["jane"]["id"], conversationId="c")
    await b.pump(0.4)
    await bystander.pump(0.3)
    t = b.of("typing")
    assert t and t[0]["fromUsername"] == "john"
    assert not bystander.of("typing")