#!/usr/bin/env bash
# Teste les migrations + les règles RLS sur un Postgres « nu ».
# Usage : DATABASE_URL=postgres://postgres@localhost:5432/postgres ./scripts/test-db.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_URL="${DATABASE_URL:-postgres://postgres@localhost:5432/postgres}"
TEST_DB="umetum_test_$$"

psql "$ADMIN_URL" -q -c "create database $TEST_DB"
trap 'psql "$ADMIN_URL" -q -c "drop database if exists $TEST_DB with (force)"' EXIT

TEST_URL="${ADMIN_URL%/*}/$TEST_DB"
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/supabase_stub.sql"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$migration"
done
psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/seed.sql"
OUTPUT="$(psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$ROOT/supabase/tests/rls_test.sql" 2>&1)" || {
  echo "$OUTPUT"
  echo "❌ Tests RLS en échec"
  exit 1
}
echo "$OUTPUT"
grep -q ALL_RLS_TESTS_PASSED <<<"$OUTPUT"
echo "✅ Base de données : migrations, seed et RLS OK"
