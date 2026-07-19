#!/bin/bash
echo "Starting Redis server..."
redis-server --daemonize yes

echo "Starting RQ background worker..."
python -m backend.worker &

echo "Starting FastAPI application on port 7860..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 7860
