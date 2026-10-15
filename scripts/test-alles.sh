#!/usr/bin/env bash
# Alle tests, in twee tijdzones.
#
# De tweede zone is er niet voor de volledigheid. Deze code draait op
# Cloudflare met de klok op UTC, en de bouwomgeving van Lovable ook. Een test
# die de klok van de machine leest in plaats van de Nederlandse wandklok,
# slaagt dan op een laptop in Amsterdam en zakt in productie — dat is precies
# wat er op 15 oktober 2026 gebeurde met de rem op het verzendtempo.
#
#   bash scripts/test-alles.sh
set -u
cd "$(dirname "$0")/.."

gezakt=0
for tz in Europe/Amsterdam UTC; do
  printf '\n%s\n' "=== TZ=$tz ==="
  for t in scripts/test-*.ts scripts/test-scheiding.mjs; do
    n=$(basename "$t")
    if TZ=$tz node "$t" >/dev/null 2>&1; then
      printf '  ✓ %s\n' "$n"
    else
      printf '  ✗ %s\n' "$n"
      gezakt=$((gezakt + 1))
    fi
  done
done

printf '\n%s\n' "=== typecheck ==="
if ./node_modules/.bin/tsc --noEmit; then
  printf '  ✓ schoon\n'
else
  printf '  ✗ fouten\n'
  gezakt=$((gezakt + 1))
fi

printf '\n'
if [ "$gezakt" -gt 0 ]; then
  echo "$gezakt onderdeel/onderdelen gezakt."
  exit 1
fi
echo "Alles in orde, in beide tijdzones."
