#!/bin/sh
set -eu

for seed in /workspace/database/seeds/*.sql; do
    echo "Aplicando $(basename "$seed")"
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$seed"
done
