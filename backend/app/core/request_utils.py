from __future__ import annotations

import ipaddress

from fastapi import Request


def get_client_ip(request: Request, trusted_proxies: list[str]) -> str:
    """Return the real client IP.

    Reads X-Forwarded-For only when the immediate peer address falls within a
    trusted proxy CIDR. Falls back to the peer address when no trusted proxies
    are configured or the peer is not in the trusted list.
    """
    peer = request.client.host if request.client else None
    if peer and trusted_proxies and _is_trusted(peer, trusted_proxies):
        xff = request.headers.get("x-forwarded-for")
        if xff:
            return xff.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
    return peer or "unknown"


def _is_trusted(ip: str, cidrs: list[str]) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in ipaddress.ip_network(c, strict=False) for c in cidrs)
    except ValueError:
        return False
