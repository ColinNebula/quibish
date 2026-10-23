async def test_call_offer_gets_server_set_caller_identity(connect, users):
    a = await connect(users["john"]["token"])
    b = await connect(users["jane"]["token"])
    await a.send(type="call-offer", targetUserId=users["jane"]["id"], callId="c1", offer={"sdp": "x"},
                 fromUser={"id": "evil", "name": "Mallory"})
    await b.pump(0.5)
    offer = b.of("call-offer")[0]
    assert offer["fromUser"]["id"] == users["john"]["id"]
    assert offer["fromUserId"] == users["john"]["id"]


async def test_call_to_offline_user_reports_unavailable(connect, users):
    a = await connect(users["john"]["token"])
    await a.send(type="call-offer", targetUserId="424242", callId="c2", offer={"sdp": "x"})
    await a.pump(0.5)
    assert a.of("call-unavailable")