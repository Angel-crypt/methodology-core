.PHONY: help
.PHONY: backend-install backend-dev backend-test backend-lint
.PHONY: frontend-install frontend-dev frontend-build frontend-lint
.PHONY: mock-install mock-dev mock-start
.PHONY: dev-check
.PHONY: k3s-namespace k3s-secret-from-env
.PHONY: k3s-apply-real k3s-apply-mock k3s-migrate k3s-status k3s-delete
.PHONY: k3s-deploy-real k3s-deploy-mock

help:
	@printf "\nTargets disponibles:\n"
	@printf "  Desarrollo local (sin k3s):\n"
	@printf "    make backend-install   - Instala dependencias backend\n"
	@printf "    make backend-dev       - Ejecuta backend en modo dev\n"
	@printf "    make backend-test      - Ejecuta tests backend\n"
	@printf "    make backend-lint      - Ejecuta ruff + mypy backend\n"
	@printf "    make frontend-install  - Instala dependencias frontend\n"
	@printf "    make frontend-dev      - Ejecuta frontend en modo dev\n"
	@printf "    make frontend-build    - Build de frontend\n"
	@printf "    make frontend-lint     - Lint de frontend\n"
	@printf "    make mock-install      - Instala dependencias mock\n"
	@printf "    make mock-dev          - Ejecuta mock server en modo dev\n"
	@printf "    make mock-start        - Ejecuta mock server en modo estable\n"
	@printf "    make dev-check         - Verifica herramientas locales\n"
	@printf "\n  k3s (integracion/despliegue):\n"
	@printf "    make k3s-namespace     - Crea namespace methodology\n"
	@printf "    make k3s-secret-from-env - Crea secret desde variables de entorno\n"
	@printf "    make k3s-apply-real    - Aplica overlay real\n"
	@printf "    make k3s-apply-mock    - Aplica overlay mock\n"
	@printf "    make k3s-migrate       - Ejecuta job de migracion\n"
	@printf "    make k3s-deploy-real   - Namespace + overlay real + migracion + status\n"
	@printf "    make k3s-deploy-mock   - Namespace + overlay mock + status\n"
	@printf "    make k3s-status        - Estado de recursos en namespace methodology\n"
	@printf "    make k3s-delete        - Elimina namespace methodology\n\n"

backend-install:
	cd backend && uv sync --all-groups

backend-dev:
	cd backend && uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

backend-test:
	cd backend && uv run pytest

backend-lint:
	cd backend && uv run ruff check . && uv run mypy .

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-lint:
	cd frontend && npm run lint

mock-install:
	cd mock && npm install

mock-dev:
	cd mock && npm run dev

mock-start:
	cd mock && npm start

dev-check:
	@command -v uv >/dev/null && echo "uv: OK" || (echo "uv: faltante" && exit 1)
	@command -v node >/dev/null && echo "node: OK" || (echo "node: faltante" && exit 1)
	@command -v npm >/dev/null && echo "npm: OK" || (echo "npm: faltante" && exit 1)
	@command -v kubectl >/dev/null && echo "kubectl: OK" || (echo "kubectl: faltante" && exit 1)

k3s-namespace:
	kubectl apply -f deploy/k3s/base/namespace.yaml

k3s-secret-from-env: k3s-namespace
	./scripts/create-k8s-secret.sh methodology

k3s-apply-real: k3s-namespace
	kubectl apply -k deploy/k3s/overlays/real

k3s-apply-mock: k3s-namespace
	kubectl apply -k deploy/k3s/overlays/mock

k3s-migrate:
	kubectl -n methodology delete job backend-migration --ignore-not-found
	kubectl -n methodology apply -f deploy/k3s/base/migration-job.yaml
	kubectl -n methodology wait --for=condition=complete --timeout=180s job/backend-migration

k3s-status:
	kubectl -n methodology get pods,svc,ingress

k3s-deploy-real: k3s-apply-real k3s-migrate k3s-status

k3s-deploy-mock: k3s-apply-mock k3s-status

k3s-delete:
	kubectl delete namespace methodology --ignore-not-found
