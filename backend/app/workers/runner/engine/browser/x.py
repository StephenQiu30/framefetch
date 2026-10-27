"""Read X's own GraphQL responses; never synthesize signed API requests."""

from collections.abc import Mapping
from math import isfinite
from typing import Any
from urllib.parse import urlsplit

from app.services.provider_failures import FailureClass
from app.services.provider_types import BrowserRules
from app.workers.runner.engine.browser.intercept import failure, objects, public_item
from app.workers.runner.engine.resolved import ResolvedMedia

RULES = BrowserRules("x", ("/TweetDetail", "/TweetResultByRestId"))
HOME = "https://x.com/"
STATE = "() => null"


def parse_response(
    payload: Mapping[str, object],
    expected_id: str | None = None,
    selected_index: int | None = None,
) -> ResolvedMedia:
    try:
        return _parse(payload, expected_id, selected_index)
    except (KeyError, TypeError, ValueError, OverflowError, AttributeError):
        raise failure(FailureClass.EXTRACTOR_BROKEN, "invalid_page_metadata") from None


def _target_result(payload: Mapping[str, object], expected_id: str) -> dict[str, Any]:
    requested = payload.get("_framefetch_requested_id")
    if requested is not None and requested != expected_id:
        return {}
    data = payload.get("data")
    if not isinstance(data, dict):
        return {}
    direct = data.get("tweetResult", {}).get("result")
    if isinstance(direct, dict):
        tweet = (
            direct.get("tweet", {})
            if direct.get("__typename") == "TweetWithVisibilityResults"
            else direct
        )
        if tweet.get("rest_id") == expected_id or requested == expected_id:
            return direct
        return {}
    # Only the requested timeline entry may supply media. Explicit paths keep
    # visibility wrappers in scope and exclude replies/recommendations/quotes.
    instructions = data.get("threaded_conversation_with_injections_v2", {}).get(
        "instructions", []
    )
    if not isinstance(instructions, list):
        return {}
    for instruction in instructions[:100]:
        if not isinstance(instruction, dict):
            continue
        entries = instruction.get("entries", [])
        if not isinstance(entries, list):
            continue
        for entry in entries[:100]:
            if (
                not isinstance(entry, dict)
                or entry.get("entryId") != f"tweet-{expected_id}"
            ):
                continue
            result = (
                entry.get("content", {})
                .get("itemContent", {})
                .get("tweet_results", {})
                .get("result")
            )
            return result if isinstance(result, dict) else {}
    return {}


def _public_result(item: dict[str, Any]) -> None:
    public_item(item)
    for node in objects(item):
        if node.get("__typename") in {"TweetTombstone", "TweetUnavailable"} or any(
            node.get(key)
            for key in (
                "tombstone",
                "tweetInterstitial",
                "withheld_in_countries",
                "withheld_scope",
                "limitedActionResults",
                "superFollowsOnlyPost",
                "exclusive_tweet_results",
            )
        ):
            raise failure(
                FailureClass.CONTENT_UNAVAILABLE, "restricted_content", "none"
            )


def _parse(
    payload: Mapping[str, object],
    expected_id: str | None,
    selected_index: int | None,
) -> ResolvedMedia:
    if not isinstance(expected_id, str) or not expected_id.isdigit():
        raise failure(FailureClass.EXTRACTOR_BROKEN, "work_identity_missing")
    item = _target_result(payload, expected_id)
    _public_result(item)
    if item.get("__typename") == "TweetWithVisibilityResults":
        item = item.get("tweet", {})
    if (
        item.get("__typename") != "Tweet"
        or item.get("rest_id") != expected_id
        or not isinstance(item.get("legacy"), dict)
        or item["legacy"].get("id_str") != expected_id
    ):
        raise failure(FailureClass.EXTRACTOR_BROKEN, "status_missing")
    author = item.get("core", {}).get("user_results", {}).get("result", {})
    # Newer responses keep privacy separately from the legacy user shape.
    protected = author.get("privacy", {}).get(
        "protected", author.get("legacy", {}).get("protected")
    )
    if protected is not False:
        raise failure(
            FailureClass.CONTENT_UNAVAILABLE, "public_status_unproven", "none"
        )
    legacy = item["legacy"]
    assets = legacy.get("extended_entities", {}).get("media", [])
    if not isinstance(assets, list) or not assets or len(assets) > 16:
        raise failure(FailureClass.EXTRACTOR_BROKEN, "video_missing")
    if selected_index is None:
        videos = [
            asset
            for asset in assets
            if isinstance(asset, dict)
            and asset.get("type") in {"video", "animated_gif"}
        ]
        if len(videos) != 1:
            raise failure(
                FailureClass.FORMAT_UNAVAILABLE, "video_selection_required", "none"
            )
        asset = videos[0]
    else:
        if not 1 <= selected_index <= len(assets):
            raise failure(
                FailureClass.FORMAT_UNAVAILABLE, "video_selection_invalid", "none"
            )
        asset = assets[selected_index - 1]
    if not isinstance(asset, dict) or asset.get("type") != "video":
        raise failure(
            FailureClass.FORMAT_UNAVAILABLE, "video_selection_invalid", "none"
        )
    media_id = asset.get("id_str")
    info = asset.get("video_info", {})
    duration = float(info.get("duration_millis", 0)) / 1000
    if (
        not isinstance(media_id, str)
        or not media_id.isdigit()
        or not 0 < duration <= 86400
        or not isfinite(duration)
    ):
        raise failure(FailureClass.EXTRACTOR_BROKEN, "invalid_page_metadata")
    formats: list[dict[str, Any]] = []
    variants = info.get("variants", [])
    if not isinstance(variants, list):
        raise failure(FailureClass.EXTRACTOR_BROKEN, "invalid_page_metadata")
    for variant in variants[:64]:
        if not isinstance(variant, dict) or variant.get("content_type") != "video/mp4":
            continue
        url = variant.get("url")
        if not isinstance(url, str):
            continue
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or parsed.hostname != "video.twimg.com"
            or parsed.username
            or parsed.password
            or parsed.port not in (None, 443)
            or not parsed.path.endswith(".mp4")
        ):
            continue
        formats.append(
            {"format_id": f"browser-{len(formats)}", "url": url, "ext": "mp4"}
        )
    if not formats:
        raise failure(FailureClass.FORMAT_UNAVAILABLE, "clear_mp4_missing", "none")
    # Codec, dimensions and fps remain unknown until BrowserLayer's real probe.
    title = legacy.get("full_text") or expected_id
    if (
        not isinstance(title, str)
        or len(title) > 4096
        or any(ord(c) < 32 for c in title)
    ):
        title = expected_id
    download_info = {
        "id": media_id,
        "title": title,
        "duration": duration,
        "extractor_key": "Twitter",
        "formats": formats,
    }
    return ResolvedMedia(
        provider_media_id=media_id,
        title=title,
        duration_seconds=duration,
        extractor_key="Twitter",
        streams=(),
        download_info=download_info,
        client="x:browser",
    )
