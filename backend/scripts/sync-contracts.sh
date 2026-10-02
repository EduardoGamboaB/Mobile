#!/usr/bin/env bash
# Copia a G3 Drive y G3 Admin los contratos sin dependencias:
#  - vocabulario único de estados del viaje (contracts/src/trip-status.ts)
#  - catálogo de proveedores externos (contracts/src/integrations-catalog.ts)
# El test contracts/test/trip-status.spec.ts falla si las copias se desfasan.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
sync() {
  local SRC="$1"; shift
  for DEST in "$@"; do
    mkdir -p "$(dirname "$DEST")"
    cp "$SRC" "$DEST"
    echo "sincronizado → ${DEST#$ROOT/}"
  done
}
sync "$ROOT/backend/contracts/src/trip-status.ts" \
  "$ROOT/mobile/src/contracts/tripStatus.ts" "$ROOT/admin/lib/contracts/tripStatus.ts"
sync "$ROOT/backend/contracts/src/integrations-catalog.ts" \
  "$ROOT/admin/lib/contracts/integrationsCatalog.ts"
