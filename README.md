# Aarohi AI

Aarohi is a cloud-first AI-agent starter designed to run from a phone browser while compute and secrets stay on the server.

## Current foundation
- Responsive chat interface.
- FastAPI backend with health endpoint and an OpenAI-compatible model adapter.
- Optional public-web search through DuckDuckGo.
- Environment-variable configuration; no API keys are committed.
- Basic request limits, timeouts, and safe error messages.
- Docker and Render deployment configuration plus a smoke test.

## Run locally
Python 3.11+ is recommended.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --reload
```

Open http://127.0.0.1:8000. Without model credentials, the app explains what needs configuring rather than pretending an AI response was generated.

## Configure an AI model
Set these server-side environment variables in your hosting provider:
- `MODEL_BASE_URL`: OpenAI-compatible API base URL (provider-specific).
- `MODEL_API_KEY`: secret API key; never put it in browser code or GitHub.
- `MODEL_NAME`: model identifier supported by that endpoint.

The app sends only chat messages to the configured model endpoint. Review your provider's data policy before using sensitive information.

## Deploy
Deploy this repository as a Docker web service on a compatible host (for example, Render). Add the environment variables above in the host dashboard. Do not commit a real `.env` file.

## Security and honest limitations
- This starter does **not** yet execute arbitrary user code. A production coding agent needs a separate isolated sandbox with CPU/memory/time limits and network restrictions.
- GitHub write actions, autonomous self-modification, persistent memory, and background jobs are not enabled yet. Add them behind explicit permissions and audit logs.
- Free hosting and model providers have quotas, sleeping services, and changing terms; unlimited free operation cannot be guaranteed.
- Never expose provider tokens in frontend JavaScript, logs, screenshots, or commits.

## Project status
Initial foundation only. Deployment, provider configuration, and runtime tests must be completed in the chosen hosting account before calling Aarohi live.
