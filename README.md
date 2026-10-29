# Aarohi AI

Aarohi is a cloud-first AI workspace. The phone runs the web interface; model requests run on the server and the selected provider's infrastructure.

## Multi-provider support

Aarohi uses LiteLLM to route chat requests to configured providers:
- OpenAI / ChatGPT API
- Google Gemini
- Groq
- Cohere
- Meta Llama models hosted through Together AI
- Anthropic Claude
- DeepSeek
- Mistral
- Custom OpenAI-compatible HTTPS endpoints

Meta Llama is a model family, not a universal Meta-hosted API endpoint. This starter configures Together AI as one possible host for Llama models.

## Configure providers

In the hosting dashboard (or a private local .env file), set a provider's API key AND its model ID. The app only shows providers with both values configured.

- OPENAI_API_KEY and OPENAI_MODEL
- GEMINI_API_KEY and GEMINI_MODEL
- GROQ_API_KEY and GROQ_MODEL
- COHERE_API_KEY and COHERE_MODEL
- TOGETHER_API_KEY and TOGETHER_MODEL for Meta Llama models served by Together
- ANTHROPIC_API_KEY and ANTHROPIC_MODEL
- DEEPSEEK_API_KEY and DEEPSEEK_MODEL
- MISTRAL_API_KEY and MISTRAL_MODEL
- Custom endpoint: CUSTOM_API_BASE, CUSTOM_API_KEY, CUSTOM_MODEL

Use the exact current model ID shown by each provider. Model catalogs change. DEFAULT_AI_PROVIDER controls the preselected provider when configured. API keys must be set only in server-side environment settings and never committed to GitHub or exposed in browser code.

## Run locally

Python 3.11+ recommended.

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app:app --reload
```

Open http://127.0.0.1:8000. Configure at least one provider key and model ID to send real model requests.

## Deploy

Deploy as a Docker web service on a compatible host. render.yaml lists optional environment settings; add actual secrets and valid model IDs in the host dashboard. Deployment and provider connectivity must be tested before considering Aarohi live.

## Security and limitations

- Providers have separate terms, data handling, quotas, and pricing; not all are free.
- Requests are sent to the provider selected in the model picker. Avoid sending sensitive data unless you have reviewed that provider's policies.
- This starter does not yet execute arbitrary user code. A coding agent needs a separate isolated sandbox with strict CPU, memory, time, and network limits.
- GitHub write actions, persistent memory, background jobs, web research, and autonomous self-modification are not yet enabled in this starter.
- The basic per-process rate limiter is not a substitute for production authentication or shared rate limiting.
- Never expose API tokens in frontend JavaScript, logs, screenshots, or commits.

## Project status

The multi-provider selector and routing foundation are in the repository. Providers will appear only after their API keys and model IDs are configured on the server. Deployment, provider calls, and runtime tests still need verification.
