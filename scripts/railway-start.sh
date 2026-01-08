#!/usr/bin/env bash
set -euo pipefail

target="${START_APP:-}"

if [[ -z "${target}" ]]; then
  serviceName="${RAILWAY_SERVICE_NAME:-${SERVICE_NAME:-}}"
  serviceNameLower="$(echo "${serviceName}" | tr '[:upper:]' '[:lower:]')"

  if [[ "${serviceNameLower}" == *"api"* ]]; then
    target="api"
  elif [[ "${serviceNameLower}" == *"web"* ]] || [[ "${serviceNameLower}" == *"frontend"* ]] || [[ "${serviceNameLower}" == *"next"* ]]; then
    target="web"
  fi
fi

case "${target}" in
  api)
    echo "Running database migrations..."
    pnpm exec prisma migrate deploy --schema=packages/data-model/prisma/schema.prisma
    exec pnpm --filter api start
    ;;
  web)
    exec pnpm --filter web start
    ;;
  *)
    echo "ERROR: No start target selected." >&2
    echo "Set START_APP=api or START_APP=web in Railway service variables." >&2
    if [[ -n "${RAILWAY_SERVICE_NAME:-}" ]]; then
      echo "Detected RAILWAY_SERVICE_NAME='${RAILWAY_SERVICE_NAME}' but could not infer target." >&2
    fi
    exit 1
    ;;
esac



