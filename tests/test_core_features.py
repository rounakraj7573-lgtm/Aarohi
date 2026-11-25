from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app as aarohi


client = TestClient(aarohi.app)


@pytest.fixture(autouse=True)
def reset_in_memory_state():
    aarohi._requests.clear()
    aarohi._global_requests.clear()
    aarohi._workspace_files.clear()
    aarohi._workspace_last_seen.clear()
    yield
    aarohi._requests.clear()
    aarohi._global_requests.clear()
    aarohi._workspace_files.clear()
    aarohi._workspace_last_seen.clear()


def access_headers(workspace_id="test_workspace_000001"):
    return {
        "X-Aarohi-Access-Code": "test-access-code",
        "X-Aarohi-Workspace-ID": workspace_id,
    }


def test_health_response_has_no_store_and_security_headers():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-content-type-options"] == "nosniff"


def test_homepage_head_probe_returns_success_without_body():
    response = client.head("/")
    assert response.status_code == 200
    assert response.content == b""
    assert response.headers["content-type"].startswith("text/html")


def test_frontend_assets_and_mobile_menu_are_served():
    page = client.get("/")
    script = client.get("/app.js")
    styles = client.get("/styles.css")

    assert page.status_code == script.status_code == styles.status_code == 200
    assert 'id="mobile-menu"' in page.text
    assert "Cloud AI · local files" in page.text
    assert "exportAarohiBackup" in script.text
    assert "importAarohiBackup" in script.text
    assert "@media(max-width:760px)" in styles.text


def test_cors_preflight_allows_configured_frontend_origin():
    origin = aarohi.allowed_origins[0]
    response = client.options(
        "/api/providers",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "x-aarohi-access-code",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "x-aarohi-access-code" in response.headers["access-control-allow-headers"].lower()


def test_provider_route_requires_access_code(monkeypatch):
    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    denied = client.get("/api/providers")
    allowed = client.get("/api/providers", headers=access_headers())

    assert denied.status_code == 401
    assert allowed.status_code == 200
    assert isinstance(allowed.json()["providers"], list)


def test_chat_endpoint_uses_selected_provider_and_aarohi_identity(monkeypatch):
    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    monkeypatch.setenv("ALLOWED_PROVIDERS", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-key-not-a-real-secret")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    captured = {}

    async def fake_completion(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content="My name is Aarohi."))]
        )

    monkeypatch.setattr(aarohi.litellm, "acompletion", fake_completion)
    response = client.post(
        "/api/chat",
        headers=access_headers(),
        json={
            "provider": "gemini",
            "messages": [{"role": "user", "content": "What is your name?"}],
        },
    )

    assert response.status_code == 200
    assert response.json()["reply"] == "My name is Aarohi."
    assert response.json()["provider"] == "gemini"
    assert response.json()["model"] == "gemini-2.5-flash"
    assert captured["model"] == "gemini/gemini-2.5-flash"
    assert "You are Aarohi" in captured["messages"][0]["content"]


def test_workspace_file_crud_and_namespace_isolation(monkeypatch):
    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    headers = access_headers()
    saved = client.put(
        "/api/workspace/files",
        headers=headers,
        json={"name": "notes.txt", "content": "Aarohi workspace test"},
    )
    read = client.get("/api/workspace/files/notes.txt", headers=headers)
    other_workspace = client.get(
        "/api/workspace/files/notes.txt",
        headers=access_headers("another_workspace_00002"),
    )
    listed = client.get("/api/workspace/files", headers=headers)
    deleted = client.delete("/api/workspace/files/notes.txt", headers=headers)
    missing = client.get("/api/workspace/files/notes.txt", headers=headers)

    assert saved.status_code == 200 and saved.json()["saved"] is True
    assert read.status_code == 200 and read.json()["content"] == "Aarohi workspace test"
    assert other_workspace.status_code == 404
    assert listed.status_code == 200 and listed.json()["temporary"] is True
    assert deleted.status_code == 200 and deleted.json()["deleted"] is True
    assert missing.status_code == 404


def test_workspace_rejects_path_traversal_and_oversized_utf8_file(monkeypatch):
    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    headers = access_headers()
    traversal = client.put(
        "/api/workspace/files",
        headers=headers,
        json={"name": "../secrets.txt", "content": "no"},
    )
    oversized = client.put(
        "/api/workspace/files",
        headers=headers,
        json={"name": "large.txt", "content": "🙂" * 4097},
    )

    assert traversal.status_code == 400
    assert oversized.status_code == 413
    assert "16 KB" in oversized.json()["detail"]


def test_workspace_api_rejects_requests_without_configured_access(monkeypatch):
    monkeypatch.delenv("AAROHI_ACCESS_CODE", raising=False)
    response = client.get("/api/workspace/files", headers=access_headers())
    assert response.status_code == 503


def test_cloud_python_runner_reports_unconfigured_state_without_false_success(monkeypatch):
    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    monkeypatch.delenv("TENSORLAKE_API_KEY", raising=False)
    response = client.post(
        "/api/code/run",
        headers=access_headers(),
        json={"code": "print('hello')"},
    )

    assert response.status_code == 502
    assert "Cloud sandbox could not run" in response.json()["detail"]


def test_page_parser_removes_navigation_scripts_and_cookie_text():
    parser = aarohi._PageTextParser()
    parser.feed(
        "<html><head><title>Sample title</title><script>alert(1)</script></head>"
        "<body><nav>Menu links</nav><main><h1>Important article text</h1>"
        '<div class="cookie-banner">Cookie preferences</div>'
        "<p>More verified page content.</p></main></body></html>"
    )
    content = " ".join(parser.parts)

    assert "Sample title" in " ".join(parser.title)
    assert "Important article text" in content
    assert "More verified page content" in content
    assert "Menu links" not in content
    assert "Cookie preferences" not in content
    assert "alert(1)" not in content


def test_public_url_validator_rejects_local_and_private_addresses(monkeypatch):
    with pytest.raises(ValueError):
        aarohi._validate_public_http_url("http://localhost/admin")
    with pytest.raises(ValueError):
        aarohi._validate_public_http_url("https://user:pass@example.com")

    monkeypatch.setattr(
        aarohi.socket,
        "getaddrinfo",
        lambda host, port, type: [(None, None, None, None, ("192.168.1.5", port))],
    )
    with pytest.raises(ValueError, match="publicly reachable"):
        aarohi._validate_public_http_url("https://private.example")


def test_public_url_validator_accepts_public_dns_result(monkeypatch):
    monkeypatch.setattr(
        aarohi.socket,
        "getaddrinfo",
        lambda host, port, type: [(None, None, None, None, ("8.8.8.8", port))],
    )
    parsed = aarohi._validate_public_http_url("https://example.com/path")
    assert parsed.hostname == "example.com"
    assert parsed.path == "/path"


def test_calculator_handles_arithmetic_and_rejects_code_execution():
    assert aarohi.safe_calculate("2 + 3 * 4") == 14
    with pytest.raises(ValueError):
        aarohi.safe_calculate("__import__('os').system('id')")


def test_provider_allowlist_exposes_only_configured_approved_providers(monkeypatch):
    monkeypatch.setenv("ALLOWED_PROVIDERS", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "unit-test-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-2.5-flash")
    monkeypatch.setenv("GROQ_API_KEY", "another-unit-test-key")
    monkeypatch.setenv("GROQ_MODEL", "llama-test-model")

    providers = aarohi.configured_providers()
    assert [provider["id"] for provider in providers] == ["gemini"]


def test_rate_limit_blocks_requests_after_configured_threshold(monkeypatch):
    monkeypatch.setattr(aarohi, "RATE_LIMIT", 1)
    monkeypatch.setattr(aarohi, "GLOBAL_RATE_LIMIT", 10)
    aarohi.check_rate_limit("unit-test-client")
    with pytest.raises(aarohi.HTTPException) as error:
        aarohi.check_rate_limit("unit-test-client")
    assert error.value.status_code == 429


def test_frontend_chat_backup_is_device_local_and_not_claimed_as_cloud_sync():
    frontend = Path(aarohi.BASE_DIR, "static", "app.js").read_text(encoding="utf-8")
    assert 'localStorage.getItem(CHAT_STORE_KEY)' in frontend
    assert 'localStorage.setItem(CHAT_STORE_KEY' in frontend
    assert 'localStorage.getItem("aarohi_saved_memory")' in frontend
