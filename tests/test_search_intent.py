import pytest

from app import _explicit_search_intent


@pytest.mark.parametrize(
    "task",
    [
        "Find information about the latest AI developments worldwide.",
        "Search for recent news from Japan and Brazil.",
        "Search Japan economy",
        "Look for official sources about recent typhoon response.",
        "Find out what happened in the Philippines today.",
        "Research current climate policy updates.",
    ],
)
def test_explicit_research_requests_trigger_search(task):
    assert _explicit_search_intent(task) is True


@pytest.mark.parametrize(
    "task",
    [
        "What is a black hole?",
        "Explain how photosynthesis works.",
        "What is a search engine?",
        "What is a web search engine?",
        "Explain search engine optimization.",
    ],
)
def test_general_questions_and_search_engine_topics_do_not_trigger_search(task):
    assert _explicit_search_intent(task) is False


@pytest.mark.parametrize(
    "task",
    [
        "Web search is not needed; explain photosynthesis.",
        "No search is needed; explain gravity.",
        "Without internet browsing, explain black holes.",
        "Don't search the web; explain photosynthesis.",
        "Bina web search ke black hole samjhao.",
    ],
)
def test_explicit_no_search_instructions_override_search_words(task):
    assert _explicit_search_intent(task) is False
