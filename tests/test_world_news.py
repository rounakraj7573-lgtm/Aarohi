import app as aarohi


WORLD_NEWS_QUERY = (
    "Find 10 important real-world news articles published in the last 7 days "
    "from at least 8 different countries across different continents."
)


def test_world_news_search_targets_countries_across_continents(monkeypatch):
    observed = []

    def fake_search(query, rss_edition=None):
        country = query.split(" latest news", 1)[0]
        observed.append((query, country, rss_edition))
        return [{
            "title": f"{country} reports a new public policy",
            "href": f"https://publisher.example/{country.lower().replace(' ', '-')}/story",
            "published_at": "2026-11-27T08:00:00+00:00",
            "source_provider": "test",
        }]

    monkeypatch.setattr(aarohi, "_run_web_search_single", fake_search)

    results = aarohi.run_web_search(WORLD_NEWS_QUERY)

    assert len(observed) == len(aarohi._WORLD_NEWS_TARGETS)
    assert len(results) == 10
    assert len({item["country_query"] for item in results}) == 10
    assert len({item["continent_query"] for item in results}) >= 5
    assert all(edition and {"hl", "gl", "ceid"} <= edition.keys() for _, _, edition in observed)
    assert all("last 7 days" in query for query, _, _ in observed)


def test_world_news_returns_fewer_results_instead_of_repeating_countries(monkeypatch):
    available = {target[0] for target in aarohi._WORLD_NEWS_TARGETS[:7]}

    def fake_search(query, rss_edition=None):
        country = query.split(" latest news", 1)[0]
        if country not in available:
            return []
        return [{
            "title": f"{country} reports a new public policy",
            "href": f"https://publisher.example/{country.lower().replace(' ', '-')}/story",
            "published_at": "2026-11-27T08:00:00+00:00",
        }]

    monkeypatch.setattr(aarohi, "_run_web_search_single", fake_search)

    results = aarohi.run_web_search(WORLD_NEWS_QUERY)

    assert len(results) == 7
    assert len({item["country_query"] for item in results}) == 7


def test_research_api_preserves_world_news_country_labels(monkeypatch):
    from fastapi.testclient import TestClient

    monkeypatch.setenv("AAROHI_ACCESS_CODE", "test-access-code")
    monkeypatch.setattr(aarohi, "run_web_search", lambda query: [{
        "title": "Brazil announces a new climate policy",
        "href": "https://publisher.example/brazil/climate-policy",
        "body": "Published 2026-11-27",
        "published_at": "2026-11-27T08:00:00+00:00",
        "source_provider": "test",
        "country_query": "Brazil",
        "continent_query": "South America",
    }])
    client = TestClient(aarohi.app)
    response = client.post(
        "/api/research",
        headers={"X-Aarohi-Access-Code": "test-access-code"},
        json={"query": "worldwide latest news"},
    )

    assert response.status_code == 200
    item = response.json()["results"][0]
    assert item["country_query"] == "Brazil"
    assert item["continent_query"] == "South America"
