#!/usr/bin/env bash
# Proves the sweep SKIPS a table that is currently locked (load in progress)
# and renames it once the lock is released. Run against the local stack with
# init_normalize_public.sql already installed.
set -euo pipefail

PSQL=(docker exec -i storybook-components-postgis psql -U postgres -d gis -v ON_ERROR_STOP=1 -At)

cleanup() { "${PSQL[@]}" -c 'DROP TABLE IF EXISTS public."zz_busy"; DROP TABLE IF EXISTS public."Zz Busy";' >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

"${PSQL[@]}" -c 'CREATE TABLE public."Zz Busy" (id int);' >/dev/null

docker exec -i storybook-components-postgis psql -U postgres -d gis -c \
  'BEGIN; LOCK TABLE public."Zz Busy" IN ROW EXCLUSIVE MODE; SELECT pg_sleep(6); COMMIT;' >/dev/null &
LOCK_PID=$!
sleep 1

"${PSQL[@]}" -c 'SELECT public.normalize_public_tables();' >/dev/null
STILL_BAD=$("${PSQL[@]}" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='Zz Busy';")
if [ "$STILL_BAD" != "1" ]; then echo "FAIL: table renamed while locked"; exit 1; fi

wait "$LOCK_PID"

"${PSQL[@]}" -c 'SELECT public.normalize_public_tables();' >/dev/null
RENAMED=$("${PSQL[@]}" -c "SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename='zz_busy';")
if [ "$RENAMED" != "1" ]; then echo "FAIL: table not renamed after lock released"; exit 1; fi

echo "PASS: normalize-lock-safety.test.sh"
