import os
import time
from collections import defaultdict, deque
from typing import Literal

import litellm
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
app = FastAPI(title="Aarohi AI", version="0.2.0")
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Provider keys stay on the server. Model IDs are configurable because catalogs change.
PROVIDERS = {
    "openai": {"label": "OpenAI / ChatGPT", "key_env": "OPENAI_API_KEY", "model_env": "OPENAI_MODEL", "prefix": "openai"},
    "gemini": {"label": "Google Gemini", "key_env": "GEMINI_API_KEY", "model_env": "GEMINI_MODEL", "prefix": "gemini"},
    "groq": {"label": "Groq", "key_env": "GROQ_API_KEY", "model_env": "GROQ_MODEL", "prefix": "groq"},
    "cohere": {"label": "Cohere", "key_env": "COHERE_API_KEY", "model_env": "COHERE_MODEL", "prefix": "cohere_chat"},
    # Meta publishes Llama models; Together AI can host them.
    "meta": {"label": "Meta Llama (via Together)", "key_env": "TOGETHER_API_KEY", "model_env": "TOGETHER_MODEL", "prefix": "together_ai"},
    "anthropic": {"label": "Anthropic Claude", "key_env": "ANTHROPIC_API_KEY", "model_env": "ANTHROPIC_MODEL", "prefix": "anthropic"},
    "deepseek": {"label": "DeepSeek", "key_env": "DEEPSEEK_API_KEY", "model_env": "DEEPSEEK_MODEL", "prefix": "deepseek"},
    "mistral": {"label": "Mistral", "key_env": "MISTRAL_API_KEY", "model_env": "MISTRAL_MODEL", "prefix": "mistral"},
    "custom": {"label": "Custom OpenAI-compatible API", "key_env": "CUSTOM_API_KEY", "model_env": "CUSTOM_MODEL", "prefix": "openai", "base_env": "CUSTOM_API_BASE"},
}
_requests = defaultdict(deque)
RATE_LIMIT = max(1, int(os.getenv("RATE_LIMIT_PER_MINUTE", "20")))


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str = Field(min_length=1, max_length=12000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)
    provider: str = Field(default="gemini", min_length=1, max_length=40)


def check_rate_limit(key: str) -> None:
    now = time.time()
    bucket = _requests[key]
    while bucket and bucket[0] < now - 60:
        bucket.popleft()
    if len(bucket) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
    bucket.append(now)


def configured_providers():
    available = []
    for provider_id, config in PROVIDERS.items():
        key = os.getenv(config["key_env"], "").strip()
        model = os.getenv(config["model_env"], "").strip()
        base = os.getenv(config.get("base_env", ""), "").strip() if config.get("base_env") else ""
        if key and model and (not config.get("base_env") or base.startswith("https://")):
            available.append({
                "id": provider_id,
                "label": config["label"],
                "model": model,
                "default": provider_id == os.getenv("DEFAULT_AI_PROVIDER", "gemini"),
            })
    return available


def normalized_model(config, model_name: str) -> str:
    prefix = config["prefix"] + "/"
    return model_name if model_name.startswith(prefix) else prefix + model_name


@app.get("/")
async def index():
    return FileResponse(os.path.join(BASE_DIR, "static", "index.html"))


@app.get("/api/providers")
async def list_providers():
    return {"providers": configured_providers()}


@app.get("/api/health")
async def health():
    providers = configured_providers()
    return {"status": "ok", "app": "Aarohi AI", "model_configured": bool(providers), "configured_provider_count": len(providers)}


@app.post("/api/chat")
async def chat(payload: ChatRequest, request: Request):
    check_rate_limit(request.client.host if request.client else "unknown")
    config = PROVIDERS.get(payload.provider)
    if not config:
        raise HTTPException(status_code=400, detail="Unknown AI provider.")
    api_key = os.getenv(config["key_env"], "").strip()
    model_name = os.getenv(config["model_env"], "").strip()
    if not api_key or not model_name:
        raise HTTPException(status_code=503, detail=f"{config['label']} is not configured on the server yet.")
    api_base = os.getenv(config.get("base_env", ""), "").strip() if config.get("base_env") else None
    if config.get("base_env") and not (api_base or "").startswith("https://"):
        raise HTTPException(status_code=503, detail="Custom API base must be a valid HTTPS URL.")
    messages = [{"role": m.role, "content": m.content} for m in payload.messages]
    try:
        result = await litellm.acompletion(
            model=normalized_model(config, model_name),
            messages=messages,
            api_key=api_key,
            **({"api_base": api_base} if api_base else {}),
            temperature=0.4,
            timeout=45,
        )
        answer = result.choices[0].message.content
        if not isinstance(answer, str) or not answer.strip():
            raise HTTPException(status_code=502, detail="The selected model returned an empty response.")
        return {"reply": answer.strip(), "provider": payload.provider, "model": model_name}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=502, detail="The selected AI provider failed. Check its model ID, key, quota, and server logs.")
