#!/usr/bin/env bash
# Copia el vocabulario único de estados del viaje a G3 Drive y G3 Admin.
# Fuente de verdad: backend/contracts/src/trip-status.ts
# El test contracts/test/trip-status.spec.ts falla si las copias se desfasan.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/backend/contracts/src/trip-status.ts"
for DEST in "$ROOT/mobile/src/contracts/tripStatus.ts" "$ROOT/admin/lib/contracts/tripStatus.ts"; do
  mkdir -p "$(dirname "$DEST")"
  cp "$SRC" "$DEST"
  echo "sincronizado → ${DEST#$ROOT/}"
done
