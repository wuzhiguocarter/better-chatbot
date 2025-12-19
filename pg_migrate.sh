#!/usr/bin/env bash
set -euo pipefail

SRC_POSTGRES_URL='postgres://better:better@81.70.184.94:5376/better'
TARGET_POSTGRES_URL='postgres://your_username:your_password@localhost:5432/your_database_name'

JOBS="${JOBS:-4}"
COMPRESS="${COMPRESS:-6}"

tmpfile="$(mktemp -t pgdump.XXXXXX.dump)"
cleanup() { rm -f "$tmpfile"; }
trap cleanup EXIT

echo "==> Dumping to $tmpfile ..."
pg_dump --dbname="$SRC_POSTGRES_URL" -Fc -Z "$COMPRESS" -f "$tmpfile"

echo "==> Restoring (parallel jobs=$JOBS) ..."
pg_restore --dbname="$TARGET_POSTGRES_URL" \
  -j "$JOBS" \
  --clean --if-exists \
  --no-owner --no-privileges \
  "$tmpfile"

echo "==> Done."
