#!/usr/bin/env bash
set -euo pipefail

url=${1:?health URL is required}
attempts=${HEALTH_ATTEMPTS:-60}
interval=${HEALTH_INTERVAL:-5}
code=000

for ((attempt = 1; attempt <= attempts; attempt++)); do
  if ! code=$(curl --silent --show-error --connect-timeout 2 --max-time 5 \
    --output /dev/null --write-out '%{http_code}' "$url"); then
    code=000
  fi
  if [ "$code" = 200 ]; then
    echo "Health verified: $url (200)"
    exit 0
  fi
  echo "Health attempt $attempt/$attempts: $url ($code)" >&2
  if ((attempt < attempts)); then
    sleep "$interval"
  fi
done

echo "Health failed: $url did not return 200 (last status: $code)" >&2
exit 1
