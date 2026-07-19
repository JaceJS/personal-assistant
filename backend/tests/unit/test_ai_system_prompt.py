"""Unit tests guarding the AI chat system prompt against hallucinated actions.

Regression coverage for a bug report: a user with zero finance accounts asked
the chat about their transactions, and the model falsely claimed it had
deleted their categories. No backend code path can delete categories from
chat (verified separately) — the prompt itself had no guardrail for the
zero-accounts case and no general rule against claiming unconfirmed actions.
"""

from __future__ import annotations

from app.domains.ai.router import _SYSTEM_PROMPT


def test_prompt_instructs_model_on_empty_accounts() -> None:
    prompt = _SYSTEM_PROMPT.lower()
    assert "get_accounts" in prompt
    assert "empty" in prompt or "no account" in prompt or "belum punya akun" in prompt


def test_prompt_forbids_claiming_unconfirmed_destructive_actions() -> None:
    prompt = _SYSTEM_PROMPT.lower()
    assert "delete" in prompt or "dihapus" in prompt or "hapus" in prompt
    assert "tool result" in prompt
