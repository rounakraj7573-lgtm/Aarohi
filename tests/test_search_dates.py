from datetime import datetime, timezone, timedelta

from app import _parse_search_date, _is_recent_article, _search_terms


def test_parse_gdelt_timestamp():
    parsed = _parse_search_date("20261114T153000Z")
    assert parsed == datetime(2026, 11, 14, 15, 30, tzinfo=timezone.utc)


def test_parse_iso_timestamp():
    parsed = _parse_search_date("2026-11-14T15:30:00Z")
    assert parsed == datetime(2026, 11, 14, 15, 30, tzinfo=timezone.utc)


def test_parse_rss_date():
    parsed = _parse_search_date("Sat, 14 Nov 2026 15:30:00 GMT")
    assert parsed == datetime(2026, 11, 14, 15, 30, tzinfo=timezone.utc)


def test_reject_undated_and_old_articles():
    now = datetime(2026, 11, 15, 8, 0, tzinfo=timezone.utc)
    assert not _is_recent_article(None, now=now)
    assert not _is_recent_article(now - timedelta(days=31), now=now)
    assert _is_recent_article(now - timedelta(days=5), now=now)


def test_reject_future_articles():
    now = datetime(2026, 11, 15, 8, 0, tzinfo=timezone.utc)
    assert not _is_recent_article(now + timedelta(days=1), now=now)


def test_hinglish_stopwords_leave_topic_terms():
    terms = _search_terms(
        "Mujhe pichhle 30 din ki Philippines typhoon response news articles chahiye"
    )
    assert terms == ["philippines", "typhoon", "response"]

 
def test_country_news_query_uses_country_as_single_required_topic():
    from app import _valid_search_item, _search_terms

    query = "Japan pichle 30 din ki koi bhi verified recent news original source link"
    assert _search_terms(query) == ["japan"]
    assert _valid_search_item({
        "title": "Japan announces new economic measures",
        "href": "https://example.org/japan-news",
        "body": "Published today",
    }, query)


def test_reject_evergreen_travel_guides():
    from app import _valid_search_item

    assert not _valid_search_item({
        "title": "Japan travel guide: best places to visit",
        "href": "https://example.org/japan-guide",
        "body": "Japan tourism and attractions",
    }, "Japan recent news")


def test_accept_current_country_article_with_one_country_match():
    from app import _valid_search_item

    assert _valid_search_item({
        "title": "Brazil central bank announces policy decision",
        "href": "https://example.org/brazil-policy",
        "body": "Published November 18, 2026",
    }, "Brazil recent news")
