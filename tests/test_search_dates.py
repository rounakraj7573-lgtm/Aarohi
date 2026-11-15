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
