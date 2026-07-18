"""Import every domain's SQLAlchemy models so they register on `Base.metadata`.

A cross-domain foreign key (e.g. `Transaction.chat_session_id` -> `chat_sessions`)
is resolved by table name against `Base.metadata.tables` the first time any
mapper is configured. That only works if the model module defining the target
table has actually been imported in that process. Alembic, the FastAPI app,
and the ARQ worker are three separate entrypoints that each import a
different subset of the app on their own — every one of them must import
this module (not just the domains they use directly) so a table is never
missing when another domain's model references it.
"""

from __future__ import annotations

import app.domains.ai.models
import app.domains.finance.models  # noqa: F401
