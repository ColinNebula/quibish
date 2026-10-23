"""Verifies the same JWTs the Node backend issues at /api/auth/login."""
import os
from pathlib import Path

import jwt
from fastapi import Header, HTTPException

ISSUER = "quibish-app"
AUDIENCE = "quibish-users"


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if secret:
        return secret
    env_file = Path(__file__).resolve().parents[3] / "backend" / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("JWT_SECRET="):
                return line.split("=", 1)[1].strip().strip('"\'')
    raise RuntimeError("JWT_SECRET is not configured")


def verify_token(token: str) -> dict:
    return jwt.decode(token, _secret(), algorithms=["HS256"], issuer=ISSUER, audience=AUDIENCE)


def current_user(authorization: str = Header(default="")) -> dict:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(401, "Access token required")
    try:
        return verify_token(token)
    except jwt.PyJWTError:
        raise HTTPException(403, "Invalid token")