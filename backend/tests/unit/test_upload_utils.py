"""Unit tests: read_and_validate_upload against real magic bytes.

No filetype.guess mocking here — these tests exist because the mocked
integration tests never caught that Android MediaRecorder output
(ftyp brand mp42/isom) is detected as video/mp4, not audio/mp4.
"""

from __future__ import annotations

import struct
from io import BytesIO

import pytest
from fastapi import UploadFile

from app.core.exceptions import BadRequestError
from app.core.upload_utils import (
    AUDIO_EXT_MAP,
    AUDIO_MIME_ALLOWLIST,
    MAX_AUDIO_BYTES,
    read_and_validate_upload,
)


def _ftyp(major: bytes, *compat: bytes) -> bytes:
    body = b"ftyp" + major + b"\x00\x00\x00\x00" + b"".join(compat)
    return struct.pack(">I", len(body) + 4) + body + b"\x00" * 64


ANDROID_M4A = _ftyp(b"mp42", b"isom", b"mp42")  # MediaRecorder MPEG_4 output
IOS_M4A = _ftyp(b"M4A ", b"M4A ", b"mp42", b"isom")
WEBM = (
    bytes.fromhex("1a45dfa3")
    + bytes.fromhex("9f4286810142f7810142f2810442f38108")
    + b"\x42\x82\x84webm"
    + b"\x00" * 64
)


def _upload(data: bytes) -> UploadFile:
    return UploadFile(file=BytesIO(data), filename="recording.m4a")


async def _validate_audio(data: bytes) -> tuple[bytes, str, str]:
    return await read_and_validate_upload(
        _upload(data),
        max_bytes=MAX_AUDIO_BYTES,
        mime_allowlist=AUDIO_MIME_ALLOWLIST,
        ext_map=AUDIO_EXT_MAP,
        default_ext=".webm",
    )


async def test_accepts_android_mp42_recording_as_m4a() -> None:
    data, _, ext = await _validate_audio(ANDROID_M4A)

    assert data == ANDROID_M4A
    assert ext == ".m4a"


async def test_accepts_ios_m4a_recording() -> None:
    _, _, ext = await _validate_audio(IOS_M4A)

    assert ext == ".m4a"


async def test_accepts_webm_recording() -> None:
    _, _, ext = await _validate_audio(WEBM)

    assert ext == ".webm"


async def test_rejects_unrecognized_bytes() -> None:
    with pytest.raises(BadRequestError, match="Unsupported or invalid file type"):
        await _validate_audio(b"definitely not audio" * 10)


async def test_rejects_empty_file() -> None:
    with pytest.raises(BadRequestError, match="File cannot be empty"):
        await _validate_audio(b"")
