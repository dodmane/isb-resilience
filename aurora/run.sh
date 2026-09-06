#!/bin/bash
set -e

echo "Building and starting AURORA..."
docker compose up --build -d
echo ""
echo "AURORA is running at http://localhost:3000"
echo "To stop: docker compose down"
