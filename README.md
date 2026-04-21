# Sistema de Registro de Metricas Linguisticas

[![Tests](https://github.com/Angel-crypt/methodology-core/actions/workflows/test.yml/badge.svg?branch=dev)](https://github.com/Angel-crypt/methodology-core/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![JavaScript](https://img.shields.io/badge/-JavaScript_ES2020+-F7DF1E?style=flat&logo=javascript&logoColor=white)
![Python](https://img.shields.io/badge/-Python_3.11+-3776AB?style=flat&logo=python&logoColor=white)

Herramienta academica para registrar metricas linguisticas de forma estructurada, trazable y anonima.

## Inventario y estado del proyecto

Ver [`docs/INVENTARIO.md`](docs/INVENTARIO.md) para una descripción completa de qué existe,
qué está implementado, todos los endpoints, páginas y componentes.

## Desarrollo por componente

- Backend: `backend/README.md`
- Frontend: `frontend/README.md`
- Mock server: `mock/README.md`

Tambien puedes usar `Makefile` para desarrollo local sin k3s:

```bash
make help
make backend-dev
make frontend-dev
make mock-dev
```

## Clonar

```bash
git clone https://github.com/Angel-crypt/methodology-core.git
cd methodology-core
```

## Requisitos del sistema

Para despliegue con k3s y automatizacion con Ansible necesitas:

- `make`
- `kubectl`
- `k3s`
- `ansible`

Verifica instalacion:

```bash
make --version
kubectl version --client
ansible --version
k3s --version
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y make curl ca-certificates
curl -sfL https://get.k3s.io | sh -
sudo apt install -y ansible
```

`kubectl` queda disponible con k3s en `/usr/local/bin/kubectl`.

### macOS

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install make ansible kubectl
curl -sfL https://get.k3s.io | sh -
```

Si prefieres no instalar k3s local en macOS, puedes usar un cluster remoto y solo instalar `kubectl` + `ansible`.

### Windows

Recomendado: usar WSL2 (Ubuntu) para ejecutar `k3s`, `ansible` y `make`.

Pasos generales:

1. Instalar WSL2 y Ubuntu.
2. Abrir terminal Ubuntu y ejecutar los comandos de la seccion Linux.

Si solo operaras un cluster remoto, instala en Windows:

- `kubectl`
- `ansible` (desde WSL)
- `make` (por ejemplo con Chocolatey: `choco install make`)

## Despliegue local (k3s)

Antes de desplegar, construye e importa imagenes al runtime de k3s:

```bash
docker build -t methodology-frontend:latest ./frontend
docker build -t methodology-backend:latest ./backend
docker build -t methodology-mock:latest ./mock

docker save methodology-frontend:latest | sudo k3s ctr images import -
docker save methodology-backend:latest | sudo k3s ctr images import -
docker save methodology-mock:latest | sudo k3s ctr images import -
```

Primero crea namespace y secret (desde variables de entorno):

```bash
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
make k3s-secret-from-env
```

Tambien puedes ver ayuda del script:

```bash
./scripts/create-k8s-secret.sh --help
```

Luego aplica modo mock:

```bash
make k3s-deploy-mock
```

## Despliegue real (k3s)

```bash
make k3s-deploy-real
```

## Ver estado y limpieza

```bash
make k3s-status
make k3s-delete
```

## Despliegue automatizado (1 maquina o cluster)

Usa `ansible/README.md` para instalacion k3s, secrets y despliegue homogeneo.

## Seguridad

Credenciales y llaves se inyectan como Kubernetes Secrets.
No se usa `.env` para secretos de despliegue.
