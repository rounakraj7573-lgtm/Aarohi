import os
import time
from collections import defaultdict, deque
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="Aarohi AI", version="0.1.0")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Lightweight per-process rate limiter. Use a shared store for multi-instance deployments.
_requests = defaultdict(deque)
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


def check_rate_limit(key: str) -> None:
    now = time.time()
    bucket = _requests[key]
    while bucket and bucket[0] < now - 60:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
    bucket.append(now)


@app.get("/")
async def index():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Aarohi AI", "model_configured": bool(os.getenv("MODEL_BASE_URL") and os.getenv("MODEL_API_KEY") and os.getenv("MODEL_NAME"))}


@app.post("/api/chat")
async def chat(payload: ChatRequest, request: Request):
    check_rate_limit(request.client.host if request.client else "unknown")
    base_url = os.getenv("MODEL_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("MODEL_API_KEY", "").strip()
    model = os.getenv("MODEL_NAME", "").strip()
    if not (base_url and api_key and model):
        raise HTTPException(
            status_code=503,
            detail="AI model is not configured yet. Add MODEL_BASE_URL, MODEL_API_KEY, and MODEL_NAME in your hosting environment settings."
        )

    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    # Keep a stable API shape for OpenAI-compatible providers.
    url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=10.0)) as client:
            response = await client.post(
                url,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={"model": model, "messages": messages, "temperature": 0.4},
            )
        if response.status_code >= 400:
            # Do not pass provider response bodies through; they may reveal implementation details.
            raise HTTPException(status_code=502, detail=f"Model provider returned HTTP {response.status_code}. Check provider settings and quota.")
        data = response.json()
        answer = data.get("choices", [{}])[0].get("message", {}).get("content")
        if not isinstance(answer, str) or not answer.strip():
            raise HTTPException(status_code=502, detail="The model provider returned an empty response.")
        return {"reply": answer.strip(), "model": model}
    except HTTPException:
        raise
    except (httpx.HTTPError, ValueError, KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Could not reach the configured model provider. Check its URL and try again.")
