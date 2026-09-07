"""Personal clear-stream adapters; credentials remain inside the yt-dlp process.

Uses the pinned upstream extractors. A login is not evidence of completeness:
Youku segment coverage and Tencent page/API durations must independently agree.
Unknown responses fail closed and require a parser update, not a startup repair.
"""

from __future__ import annotations

import json
import math
from typing import Any

from yt_dlp.extractor.tencent import VQQVideoIE  # type: ignore[import-untyped]
from yt_dlp.extractor.youku import YoukuIE  # type: ignore[import-untyped]

from ._content_access import reject


def positive_duration(value: Any) -> float:
    try:
        number = float(value) if not isinstance(value, bool) else 0
    except (TypeError, ValueError, OverflowError):
        number = 0
    if not math.isfinite(number) or number <= 0:
        reject("content_access_metadata_invalid")
    return number


def same_duration(actual: Any, expected: float) -> None:
    if abs(positive_duration(actual) - expected) > max(3, expected * 0.02):
        reject("content_preview_only")


def full_youku_streams(data: dict[str, Any]) -> list[dict[str, Any]]:
    video = data.get("video")
    if not isinstance(video, dict):
        reject("content_access_metadata_invalid")
    duration = positive_duration(video.get("seconds"))
    streams = data.get("stream")
    if not isinstance(streams, list) or not streams:
        reject("content_access_metadata_invalid")
    complete = []
    for stream in streams:
        if not isinstance(stream, dict):
            reject("content_access_metadata_invalid")
        if stream.get("channel_type") == "tail":
            continue
        segments = stream.get("segs")
        if not isinstance(segments, list) or not segments:
            reject("content_access_metadata_invalid")
        if any(not isinstance(seg, dict) for seg in segments):
            reject("content_access_metadata_invalid")
        # you-get also identifies missing cdn_url as a preview restriction.
        if any(
            not isinstance(seg.get("cdn_url"), str) or not seg["cdn_url"]
            for seg in segments
        ):
            continue
        # The original video duration is retained for post-download ffprobe;
        # never substitute the shorter preview's duration.
        milliseconds = stream.get("milliseconds_video")
        if milliseconds is not None:
            if abs(positive_duration(milliseconds) / 1000 - duration) > max(
                3, duration * 0.02
            ):
                continue
        complete.append(stream)
    if not complete:
        reject("content_preview_only")
    return complete


class _YoukuPersonalIE(YoukuIE, plugin_name="personal_video"):  # type: ignore[misc, call-arg]
    def _download_json(
        self, url_or_request: Any, video_id: str, *args: Any, **kwargs: Any
    ) -> Any:
        result = super()._download_json(url_or_request, video_id, *args, **kwargs)
        if url_or_request == "https://ups.youku.com/ups/get.json":
            if not isinstance(result, dict) or not isinstance(result.get("data"), dict):
                reject("content_access_metadata_invalid")
            data = result["data"]
            if not data.get("error"):
                data["stream"] = full_youku_streams(data)
        return result

    def _real_extract(self, url: str) -> Any:
        result = super()._real_extract(url)
        duration = positive_duration(result.get("duration"))
        clear_formats = []
        saw_drm = False
        for original in result["formats"]:
            # Upstream Youku emits a URL without parsing the manifest. Parse it
            # here so yt-dlp can identify DRM before exposing a selectable format.
            formats = self._extract_m3u8_formats(
                original["url"], result["id"], "mp4", m3u8_id=original["format_id"]
            )
            for item in formats:
                if item.get("has_drm"):
                    saw_drm = True
                    continue
                clear_formats.append({**original, **item})
        if not clear_formats:
            reject("drm_protected" if saw_drm else "content_access_metadata_invalid")
        result["formats"] = clear_formats
        result["duration"] = duration
        result["_framefetch_full_stream"] = True
        return result


class _VQQPersonalIE(VQQVideoIE, plugin_name="personal_video"):  # type: ignore[misc, call-arg]
    _full_duration: float | None = None
    _saw_drm = False

    def _real_extract(self, url: str) -> Any:
        self._full_duration = None
        self._saw_drm = False
        result = super()._real_extract(url)
        if not result.get("formats"):
            reject(
                "drm_protected" if self._saw_drm else "content_access_metadata_invalid"
            )
        result["duration"] = positive_duration(self._full_duration)
        result["_framefetch_full_stream"] = True
        return result

    def _get_webpage_metadata(self, webpage: str, video_id: str) -> Any:
        result = super()._get_webpage_metadata(webpage, video_id)
        global_data = result.get("global") if isinstance(result, dict) else None
        video = global_data.get("videoInfo") if isinstance(global_data, dict) else None
        if not isinstance(video, dict) or video.get("vid") != video_id:
            reject("content_access_metadata_invalid")
        self._full_duration = positive_duration(video.get("duration"))
        return result

    def _download_webpage(
        self, url_or_request: Any, video_id: str, *args: Any, **kwargs: Any
    ) -> Any:
        if url_or_request == self._API_URL:
            cookies = self._get_cookies("https://v.qq.com/")
            mapping = {
                "vuserid": "vqq_vuserid",
                "vusession": "vqq_vusession",
                "main_login": "main_login",
                "openid": "vqq_openid",
                "appid": "vqq_appid",
                "access_token": "vqq_access_token",
            }
            token = {
                key: cookies[name].value
                for key, name in mapping.items()
                if name in cookies
            }
            if not token.get("vuserid") or not token.get("vusession"):
                reject("credential_required")
            # Exact Tencent API only; never copy the account token to CDN requests
            # or include it in argv, metadata, application logs or stored plans.
            query = dict(kwargs.get("query") or {})
            query["logintoken"] = json.dumps(token, separators=(",", ":"))
            kwargs["query"] = query
        return super()._download_webpage(url_or_request, video_id, *args, **kwargs)

    def _extract_m3u8_formats_and_subtitles(self, *args: Any, **kwargs: Any) -> Any:
        formats, subtitles = super()._extract_m3u8_formats_and_subtitles(
            *args, **kwargs
        )
        # Tencent's upstream common_info overwrites has_drm with the API flag.
        # Remove manifest-detected DRM first, so a clear API flag cannot erase it.
        self._saw_drm = self._saw_drm or any(item.get("has_drm") for item in formats)
        return [item for item in formats if not item.get("has_drm")], subtitles

    def _extract_video_formats_and_subtitles(
        self, api_response: Any, video_id: str
    ) -> Any:
        if not isinstance(api_response, dict):
            reject("content_access_metadata_invalid")
        vl = api_response.get("vl")
        videos = vl.get("vi") if isinstance(vl, dict) else None
        if (
            not isinstance(videos, list)
            or len(videos) != 1
            or not isinstance(videos[0], dict)
        ):
            reject("content_access_metadata_invalid")
        video = videos[0]
        if video.get("vid") != video_id:
            reject("content_access_metadata_invalid")
        same_duration(video.get("td"), positive_duration(self._full_duration))
        formats, subtitles = super()._extract_video_formats_and_subtitles(
            api_response, video_id
        )
        self._saw_drm = self._saw_drm or any(item.get("has_drm") for item in formats)
        return [item for item in formats if not item.get("has_drm")], subtitles
