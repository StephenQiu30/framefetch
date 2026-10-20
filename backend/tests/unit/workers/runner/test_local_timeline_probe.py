import shutil
import subprocess

import pytest
from app.services.downloads.rules.enums import FpsBucket
from app.services.downloads.rules.frame_rate import probe_frame_rate
from app.workers.runner.commands import MediaCommands
from app.workers.runner.process import ProcessSupervisor
from helpers import settings


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="FFmpeg required")
async def test_local_vfr_high_rate_section_overrides_low_header_average(
    tmp_path,
):
    path = tmp_path / "variable.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=64x64:r=60:d=3",
            "-vf",
            "setpts='if(lt(N,90),N/(15*TB),(90/15+(N-90)/60)/TB)'",
            "-fps_mode",
            "vfr",
            "-c:v",
            "libx264",
            "-an",
            str(path),
        ],
        check=True,
    )
    commands = MediaCommands(settings(tmp_path), ProcessSupervisor())
    payload = await commands.probe(path, tmp_path)
    # The full-file mean is below 30, but the second section is 60fps.
    assert (
        FpsBucket.from_fps(probe_frame_rate(payload["streams"][0])) is FpsBucket.FPS_60
    )
    await commands.verify_full_decode(path, tmp_path)


async def test_local_probe_preserves_ordinary_cadence(
    tmp_path,
):
    if not shutil.which("ffmpeg"):
        pytest.skip("FFmpeg required")
    path = tmp_path / "edited.mp4"
    # Ordinary CFR remains on the cheap metadata path; strict decode stays separate.
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=64x64:r=30:d=2",
            "-c:v",
            "libx264",
            "-an",
            str(path),
        ],
        check=True,
    )
    commands = MediaCommands(settings(tmp_path), ProcessSupervisor())
    payload = await commands.probe(path, tmp_path)
    assert probe_frame_rate(payload["streams"][0]) == pytest.approx(30, abs=0.01)


async def test_real_damaged_video_is_rejected_even_with_valid_container_metadata(
    tmp_path,
):
    import json

    from app.workers.runner.errors import RunnerFailure

    if not shutil.which("ffmpeg"):
        pytest.skip("FFmpeg required")
    path = tmp_path / "damaged.mp4"
    subprocess.run(
        [
            "ffmpeg",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "testsrc2=s=64x64:r=30:d=2",
            "-c:v",
            "libx264",
            "-an",
            str(path),
        ],
        check=True,
    )
    packets = json.loads(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_packets",
                "-show_entries",
                "packet=pos,size",
                "-of",
                "json",
                str(path),
            ]
        )
    )["packets"]
    packet = packets[len(packets) // 2]
    with path.open("r+b") as file:
        file.seek(int(packet["pos"]))
        file.write(b"\xff" * int(packet["size"]))
    commands = MediaCommands(settings(tmp_path), ProcessSupervisor())
    # The MP4 index and dimensions remain readable, so cheap header checks pass.
    payload = await commands.probe(path, tmp_path)
    assert payload["streams"][0]["width"] == 64
    with pytest.raises(RunnerFailure) as caught:
        await commands.verify_full_decode(path, tmp_path)
    assert caught.value.code == "invalid_artifact"
