"""Captured-shape X responses: exact work, selection and public-content gates."""

import asyncio
import json
from copy import deepcopy
from types import SimpleNamespace
from urllib.parse import quote

import pytest
from app.services.provider_failures import FailureClass
from app.workers.runner.engine.layers.browser import BrowserLayer, _expected_id
from app.workers.runner.errors import RunnerFailure

TWEET = "1234567890123456789"
VIDEO = "2234567890123456789"
URL = "https://video.twimg.com/ext_tw_video/2234567890123456789/pu/vid/avc1/1280x720/public.mp4"


def tweet_payload():
    return {
        "data": {
            "tweetResult": {
                "result": {
                    "__typename": "Tweet",
                    "rest_id": TWEET,
                    "core": {
                        "user_results": {
                            "result": {
                                "__typename": "User",
                                "rest_id": "42",
                                "legacy": {
                                    "protected": False,
                                    "screen_name": "public_user",
                                },
                            }
                        }
                    },
                    "legacy": {
                        "id_str": TWEET,
                        "full_text": "Public clip",
                        "extended_entities": {
                            "media": [
                                {
                                    "id_str": VIDEO,
                                    "type": "video",
                                    "video_info": {
                                        "duration_millis": 12000,
                                        "variants": [
                                            {
                                                "content_type": "video/mp4",
                                                "url": URL,
                                                "bitrate": 1000000,
                                            },
                                        ],
                                    },
                                }
                            ],
                        },
                    },
                }
            }
        }
    }


def parse(payload, expected=TWEET, index=None):
    from app.workers.runner.engine.browser.x import parse_response

    return parse_response(payload, expected, index)


def result(payload):
    return payload["data"]["tweetResult"]["result"]


def test_x_has_real_browser_fallback_and_status_url_identity():
    assert BrowserLayer.has_parser("x")
    assert (
        _expected_id(f"https://x.com/public_user/status/{TWEET}/video/2", "x") == TWEET
    )


def test_exact_tweet_and_real_video_identity_survive_normalization():
    resolved = parse(tweet_payload())
    assert resolved.provider_media_id == VIDEO
    assert resolved.duration_seconds == 12
    assert resolved.client == "x:browser"
    assert resolved.download_info["formats"][0]["url"] == URL
    with pytest.raises(RunnerFailure):
        parse(tweet_payload(), "999")


def test_recommended_and_quoted_videos_never_supply_target_media():
    payload = tweet_payload()
    original = deepcopy(result(payload))
    result(payload)["legacy"].pop("extended_entities")
    original["rest_id"] = original["legacy"]["id_str"] = "999"
    result(payload)["quoted_status_result"] = {"result": original}
    with pytest.raises(RunnerFailure):
        parse(payload)


def test_multi_video_requires_explicit_valid_source_index():
    payload = tweet_payload()
    media = result(payload)["legacy"]["extended_entities"]["media"]
    second = deepcopy(media[0])
    second["id_str"] = "3234567890123456789"
    media.append(second)
    assert parse(payload, index=2).provider_media_id == "3234567890123456789"
    for index in (None, 0, 3):
        with pytest.raises(RunnerFailure):
            parse(payload, index=index)


@pytest.mark.parametrize("protected", [True, None, "false", 0])
def test_author_public_proof_is_required_even_with_cookie(protected):
    payload = tweet_payload()
    result(payload)["core"]["user_results"]["result"]["legacy"]["protected"] = protected
    with pytest.raises(RunnerFailure) as caught:
        parse(payload)
    assert caught.value.failure.failure_class is FailureClass.CONTENT_UNAVAILABLE


@pytest.mark.parametrize(
    "flag",
    [
        "is_paid",
        "requires_purchase",
        "is_preview",
        "is_private",
        "withheld_in_countries",
        "limitedActionResults",
        "superFollowsOnlyPost",
        "has_drm",
    ],
)
def test_restricted_or_protected_tweet_is_not_public(flag):
    payload = tweet_payload()
    result(payload)[flag] = True
    with pytest.raises(RunnerFailure):
        parse(payload)


def test_hls_only_and_non_platform_media_are_not_clear_mp4():
    for url, content_type in [
        ("https://video.twimg.com/video.m3u8", "application/x-mpegURL"),
        ("https://other.example/video.mp4", "video/mp4"),
    ]:
        payload = tweet_payload()
        result(payload)["legacy"]["extended_entities"]["media"][0]["video_info"][
            "variants"
        ] = [{"url": url, "content_type": content_type}]
        with pytest.raises(RunnerFailure) as caught:
            parse(payload)
        assert caught.value.failure.failure_class is FailureClass.FORMAT_UNAVAILABLE


def test_target_tombstone_is_unavailable_not_a_missing_parser():
    payload = {
        "_framefetch_requested_id": TWEET,
        "data": {
            "tweetResult": {
                "result": {"__typename": "TweetUnavailable", "reason": "Protected"}
            }
        },
    }
    with pytest.raises(RunnerFailure) as caught:
        parse(payload)
    assert caught.value.failure.failure_class is FailureClass.CONTENT_UNAVAILABLE


def detail_payload(tweet):
    return {
        "data": {
            "threaded_conversation_with_injections_v2": {
                "instructions": [
                    {
                        "type": "TimelineAddEntries",
                        "entries": [
                            {
                                "entryId": "tweet-" + TWEET,
                                "content": {
                                    "itemContent": {"tweet_results": {"result": tweet}}
                                },
                            }
                        ],
                    }
                ]
            }
        }
    }


def test_wrapped_tweet_in_real_detail_path_is_not_lost_at_depth_limit():
    wrapped = {
        "__typename": "TweetWithVisibilityResults",
        "tweet": result(tweet_payload()),
    }
    assert parse(detail_payload(wrapped)).provider_media_id == VIDEO


@pytest.mark.parametrize("shape", ["direct", "detail"])
@pytest.mark.parametrize("signal", ["limitedActionResults", "tombstone", "has_drm"])
def test_visibility_wrapper_restrictions_are_checked_before_inner_tweet(shape, signal):
    wrapper = {
        "__typename": "TweetWithVisibilityResults",
        signal: True,
        "tweet": result(tweet_payload()),
    }
    payload = (
        detail_payload(wrapper)
        if shape == "detail"
        else {"data": {"tweetResult": {"result": wrapper}}}
    )
    with pytest.raises(RunnerFailure):
        parse(payload)


def test_target_in_quoted_or_unbound_detail_slot_cannot_supply_media():
    payload = detail_payload(result(tweet_payload()))
    payload["data"]["threaded_conversation_with_injections_v2"]["instructions"][0][
        "entries"
    ][0]["entryId"] = "tweet-999"
    with pytest.raises(RunnerFailure):
        parse(payload)


async def test_x_collector_rejects_non_success_and_binds_requested_status():
    from app.workers.runner.engine.browser.intercept import PageResponses

    collector = PageResponses(SimpleNamespace(), "x", ("/TweetResultByRestId",))
    path = "/i/api/graphql/firstPartyOperation/TweetResultByRestId?variables=" + quote(
        json.dumps({"tweetId": TWEET})
    )
    for origin, status in [
        ("http://x.com", 200),
        ("https://other.example", 200),
        ("https://x.com", 403),
        ("https://twitter.com", 200),
    ]:

        async def body():
            return json.dumps(tweet_payload()).encode()

        collector._response(
            SimpleNamespace(url=origin + path, status=status, headers={}, body=body)
        )
    await asyncio.gather(*collector.tasks)
    assert collector.queue.qsize() == 1
    assert collector.queue.get_nowait()["_framefetch_requested_id"] == TWEET
