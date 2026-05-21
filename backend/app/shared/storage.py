"""Cloudflare R2 object storage client.

R2 exposes an S3-compatible API, so the standard async S3 client (aioboto3) is
used. Audio recordings are uploaded here by the API and downloaded by the worker.
"""

from __future__ import annotations

import aioboto3

from app.core.config import Settings

# R2 ignores the region but the S3 client still requires one.
_R2_REGION = "auto"


class R2Storage:
    """Thin async wrapper over Cloudflare R2 (S3-compatible API)."""

    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.r2_bucket_name
        self._session = aioboto3.Session()
        self._client_kwargs: dict[str, str] = {
            "service_name": "s3",
            "endpoint_url": settings.r2_endpoint_url,
            "aws_access_key_id": settings.r2_access_key_id,
            "aws_secret_access_key": settings.r2_secret_access_key,
            "region_name": _R2_REGION,
        }

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Upload `data` to the given object key."""
        async with self._session.client(**self._client_kwargs) as client:
            await client.put_object(
                Bucket=self._bucket, Key=key, Body=data, ContentType=content_type
            )

    async def download(self, key: str) -> bytes:
        """Download the object at `key` and return its raw bytes."""
        async with self._session.client(**self._client_kwargs) as client:
            response = await client.get_object(Bucket=self._bucket, Key=key)
            async with response["Body"] as stream:
                # aioboto3 is untyped; pin the result to bytes for the type checker.
                data: bytes = await stream.read()
                return data
