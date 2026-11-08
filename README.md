# Aarohi AI

Aarohi is a cloud-first AI assistant. The Android phone/browser runs the interface; AI requests and Python execution run in cloud services.

## Current architecture

- **Frontend:** static HTML/CSS/JavaScript hosted on Render.
- **Backend:** FastAPI + LiteLLM on Render.
- **AI providers:** provider registry supports Gemini, Groq, OpenAI, OpenRouter, Cohere, Together AI (Llama hosting), Anthropic, DeepSeek, Mistral and custom OpenAI-compatible endpoints. Only IDs in `ALLOWED_PROVIDERS` with a configured API key and model ID appear in the app.
- **Web research:** DDGS search with public RSS fallbacks; results may be incomplete or unavailable.
- **Agent tools:** calculator, public webpage reader and web search. Website content is untrusted input and is not treated as instructions.
- **Python:** `/api/code/run` uses Tensorlake's isolated cloud sandbox when `TENSORLAKE_API_KEY` is configured. Current settings request 1 vCPU, 1 GB RAM, a 60-second sandbox lifetime, a 20-second process timeout, no guest internet access, one concurrent run, and context-managed cleanup. Availability and exact free-tier limits depend on Tensorlake's current account plan.
- **Workspace files:** small, temporary in-memory files; max 10 files, 16 KB per file, 64 KB total per workspace, 500 workspaces, and 24-hour idle expiry. Files can disappear on restart or eviction.
- **Chat history and saved memory:** stored in the current browser/device. Export/import JSON backup is available; there is no automatic cloud sync.

## Server environment

Set secrets only in the backend hosting dashboard. Never paste them into chat, frontend JavaScript, GitHub, screenshots, or logs.

Required for the private beta:
- `AAROHI_ACCESS_CODE` — private shared access code.
- `CORS_ORIGINS` — exact frontend origin, e.g. `https://aarohi-home.onrender.com`.
- `ALLOWED_PROVIDERS` — explicit provider allowlist.
- For each enabled provider, its API key and exact model ID (for example `GEMINI_API_KEY` + `GEMINI_MODEL`).
- `TENSORLAKE_API_KEY` — required for isolated cloud Python execution.

Optional limits:
- `RATE_LIMIT_PER_MINUTE` (default 8 per client).
- `GLOBAL_RATE_LIMIT_PER_MINUTE` (default 40 per process).
- `DEFAULT_AI_PROVIDER` (default Gemini).

**Zero-cost reminder:** a provider being integrated does not mean its API is free. Check the selected provider/model's current pricing and free quota before enabling it. To keep the strict ₹0 target, enable only models that explicitly offer a free quota and do not add billing, paid credits, auto-refill, or paid upgrades. Tensorlake free-tier access is subject to its current terms and availability. Aarohi does not guarantee unlimited free usage.

## Security controls

- Shared access-code check on private API routes, using constant-time comparison.
- Per-client and global in-memory request limits.
- Conversation, prompt, workspace-file and output size limits.
- Exact-origin CORS; only required HTTP methods and headers are allowed.
- API docs/OpenAPI routes disabled on the deployed app.
- Browser security headers and no-store on API responses.
- Non-root Docker user.
- Workspace namespace count and idle-expiry caps.
- Sandbox guest has no network access; provider/sandbox keys remain server-side.

These are safeguards for a small private beta, not a substitute for individual accounts, persistent distributed rate limiting, security review, or production abuse monitoring.

## Deploy

Backend is a Docker web service; frontend is a static site. Add secrets through the hosting dashboard only. Review Render build/deploy status after every commit. A successful build alone does not prove provider connectivity or sandbox execution.

## Known limitations / final verification

- No full end-to-end test has yet been completed for all providers, web research, agent tools, Tensorlake execution, workspace CRUD, chat backup/restore, mobile UI, or error cases.
- Python package availability inside the sandbox has not been verified; do not assume NumPy, Matplotlib, or every PyPI package is installed.
- Workspace files are temporary and in-memory.
- Chat/memory data is browser-local until exported.
- Public search sources can fail or return irrelevant results.
- Free-tier quotas and model pricing can change; review them before use.
- Complete one combined verification pass before calling the project production-ready.
