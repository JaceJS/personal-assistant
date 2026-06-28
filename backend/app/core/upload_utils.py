from __future__ import annotations

import filetype
from fastapi import UploadFile

from app.core.exceptions import BadRequestError

AUDIO_MIME_ALLOWLIST: frozenset[str] = frozenset(
    {
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
        "audio/ogg",
        "audio/wav",
        "audio/flac",
        "audio/aac",
        "video/webm",  # WebM container is sometimes detected as video/webm
    }
)

AUDIO_EXT_MAP: dict[str, str] = {
    "audio/webm": ".webm",
    "video/webm": ".webm",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/flac": ".flac",
    "audio/aac": ".aac",
}

IMAGE_MIME_ALLOWLIST: frozenset[str] = frozenset(
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)

IMAGE_EXT_MAP: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_AUDIO_BYTES: int = 25 * 1024 * 1024  # 25 MB
MAX_IMAGE_BYTES: int = 10 * 1024 * 1024  # 10 MB


async def read_and_validate_upload(
    file: UploadFile,
    *,
    max_bytes: int,
    mime_allowlist: frozenset[str],
    ext_map: dict[str, str],
    default_ext: str,
) -> tuple[bytes, str, str]:
    """Read upload, enforce size limit, and verify type via magic bytes.

    Returns (data, detected_mime, extension). The mime and extension are derived
    from the file's actual bytes, not from the client-supplied Content-Type or filename.
    Raises BadRequestError on size violation or unrecognized/disallowed file type.
    """
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        mb = max_bytes // (1024 * 1024)
        raise BadRequestError(f"File exceeds {mb} MB limit")
    if not data:
        raise BadRequestError("File cannot be empty")

    kind = filetype.guess(data)
    detected_mime = kind.mime if kind else ""
    if detected_mime not in mime_allowlist:
        raise BadRequestError("Unsupported or invalid file type")

    ext = ext_map.get(detected_mime, default_ext)
    return data, detected_mime, ext
