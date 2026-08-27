#!/bin/sh
set -eu

for migration in /workspace/database/migrations/*.sql; do
    echo "Aplicando $(basename "$migration")"
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"
done
