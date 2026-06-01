#!/usr/bin/env bash
set -euo pipefail

uv run arq app.workers.voice_processor.WorkerSettings
