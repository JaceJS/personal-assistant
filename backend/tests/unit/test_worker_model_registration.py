"""Guards against a real prod incident: the ARQ worker runs as its own
Python process and only ever imports `app.workers.voice_processor` (never
`app.main`). `Transaction.chat_session_id` is a cross-domain foreign key to
`chat_sessions`, defined in `app.domains.ai.models` — a module the worker
never touched directly. SQLAlchemy resolves a table-level FK by name against
`Base.metadata` lazily, the first time something needs the tables' insert
dependency order (`session.flush()` does this internally) — so in a process
that never imported `app.domains.ai.models`, every voice/receipt worker job
raised `NoReferencedTableError` the moment it tried to create a transaction.

conftest.py imports `app.main` for the whole test session, which pulls in
every domain's models as a side effect — so a normal in-process pytest
import can't reproduce this. It only shows up in a genuinely cold process
that imports nothing but the worker module, so this test spawns one and
forces the same dependency-sort SQLAlchemy does on flush
(`Base.metadata.sorted_tables`). `configure_mappers()` alone does NOT
reproduce this: it only resolves ORM `relationship()`s, not raw FK columns.
"""

from __future__ import annotations

import subprocess
import sys


def test_worker_module_alone_can_resolve_cross_domain_foreign_keys() -> None:
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import app.workers.voice_processor\n"
            "from app.shared.models import Base\n"
            "list(Base.metadata.sorted_tables)\n",
        ],
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert result.returncode == 0, result.stderr
