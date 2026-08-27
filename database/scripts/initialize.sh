#!/bin/sh
set -eu

/bin/sh /workspace/database/scripts/migrate.sh
/bin/sh /workspace/database/scripts/seed.sh
