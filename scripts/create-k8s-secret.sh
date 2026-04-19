#!/bin/bash

set -euo pipefail

NAMESPACE="${1:-methodology}"
SECRET_NAME="methodology-secrets"

usage() {
  cat <<'EOF'
Usage:
  scripts/create-k8s-secret.sh [namespace]

Required environment variables:
  db_primary_password
  db_replica_password
  db_keycloak_user
  db_keycloak_password
  master_encryption_key
  jwt_secret_key
  keycloak_admin_user
  keycloak_admin_password
  keycloak_client_secret
  redis_password

Examples:
  export db_primary_password='...'
  export db_replica_password='...'
  export db_keycloak_user='...'
  export db_keycloak_password='...'
  export master_encryption_key='...'
  export jwt_secret_key='...'
  export keycloak_admin_user='...'
  export keycloak_admin_password='...'
  export keycloak_client_secret='...'
  export redis_password='...'
  scripts/create-k8s-secret.sh methodology
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl not found in PATH" >&2
  exit 1
fi

required_keys=(
  db_primary_password
  db_replica_password
  db_keycloak_user
  db_keycloak_password
  master_encryption_key
  jwt_secret_key
  keycloak_admin_user
  keycloak_admin_password
  keycloak_client_secret
  redis_password
)

echo "Creating namespace ${NAMESPACE} (if missing)..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

{
  echo "apiVersion: v1"
  echo "kind: Secret"
  echo "metadata:"
  echo "  name: ${SECRET_NAME}"
  echo "  namespace: ${NAMESPACE}"
  echo "type: Opaque"
  echo "stringData:"
  for key in "${required_keys[@]}"; do
    value="${!key:-}"
    if [ -z "$value" ]; then
      echo "Missing env var: ${key}" >&2
      exit 1
    fi
    printf '  %s: "%s"\n' "$key" "$value"
  done
} > "$tmp_file"

kubectl apply -f "$tmp_file"
echo "Secret ${SECRET_NAME} applied in namespace ${NAMESPACE}."
