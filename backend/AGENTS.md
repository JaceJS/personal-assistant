# Backend Agent Guidelines

## Stack

FastAPI · Python 3.12 · SQLAlchemy 2.0 async · PostgreSQL 16 · Alembic · uv

## API Response Standard

All endpoints return the same JSON envelope. No exceptions.

### Success — single item (GET /{id}, POST, PATCH)
```json
{ "message": "success", "data": { ... }, "meta": null }
```

### Success — paginated list (GET /)
```json
{
  "message": "success",
  "data": [ ... ],
  "meta": { "total": 100, "limit": 50, "offset": 0 }
}
```

### Error (4xx / 5xx)
```json
{ "message": "Resource not found", "data": null, "meta": null }
```
HTTP status code identifies the error type.

### DELETE
Returns **204 No Content** — no body.

## Helper functions (`app/core/response.py`)

```python
from app.core.response import ok, paginated

# Single item or mutation result
return ok(item)
return ok(item, message="created")   # on POST

# Paginated list
return paginated(items, total=total, limit=limit, offset=offset)

# Non-paginated list (accounts, categories)
return paginated(items, total=len(items), limit=len(items), offset=0)
```

## HTTP Status Codes

| Code | When |
|------|------|
| 200  | GET, PATCH — success |
| 201  | POST — resource created |
| 204  | DELETE — resource deleted |
| 400  | Bad request / validation error |
| 401  | Unauthenticated |
| 403  | Forbidden (wrong owner) |
| 404  | Resource not found |
| 409  | Conflict |

## Exception Handling

Raise `AppError` subclasses from service layer only. Never use `HTTPException`.

```python
from app.core.exceptions import NotFoundError, ForbiddenError, ConflictError

raise NotFoundError("Transaction not found")
raise ForbiddenError("You don't own this resource")
```

The central handler in `app/core/exceptions.py` converts these to the standard error envelope automatically.

## Database Migrations

**Always** create a new Alembic revision for any schema change. Never edit existing migration files.

```bash
# After changing models.py:
alembic revision --autogenerate -m "short_description_of_change"
alembic upgrade head
```

## Architecture

```
router.py   → HTTP only (params, auth deps, response wrapping)
service.py  → business logic, ownership checks, balance management
repository.py → raw async SQLAlchemy queries, no business logic
models.py   → SQLAlchemy ORM models
schemas.py  → Pydantic request/response models (no PaginatedList — use ApiResponse from core)
```
