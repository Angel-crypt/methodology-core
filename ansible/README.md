# Ansible para k3s

Automatiza instalacion y despliegue sobre k3s para:

- una maquina (single-node)
- cluster (1 server + N agents)

## Requisitos

- `ansible` 2.14+
- Acceso SSH a nodos
- Usuario con `sudo`
- `kubectl` disponible en la maquina donde ejecutas playbooks

## Imagenes de aplicacion

Antes de desplegar, construye y publica (o importa) estas imagenes para que k3s pueda ejecutarlas:

- `methodology-frontend:latest`
- `methodology-backend:latest`
- `methodology-mock:latest`

En entorno local single-node puedes importarlas con:

```bash
docker save methodology-frontend:latest | sudo k3s ctr images import -
docker save methodology-backend:latest | sudo k3s ctr images import -
docker save methodology-mock:latest | sudo k3s ctr images import -
```

## Flujo

1. Instalar k3s server.
2. (Opcional cluster) instalar agents.
3. Obtener kubeconfig local.
4. Crear Kubernetes Secret.
5. Desplegar manifiestos y ejecutar migracion.

Por defecto el despliegue usa overlay real (`deploy/k3s/overlays/real`).
Si quieres desplegar mock con Ansible, cambia `kustomize_overlay` en `ansible/vars/secrets.yml` a:

```yaml
kustomize_overlay: "{{ playbook_dir }}/../../deploy/k3s/overlays/mock"
```

## Single-node

```bash
cp ansible/vars/secrets.example.yml ansible/vars/secrets.yml
ansible-playbook -i ansible/inventories/single-node/hosts.ini ansible/playbooks/install-k3s-server.yml
ansible-playbook -i ansible/inventories/single-node/hosts.ini ansible/playbooks/configure-kubeconfig.yml
ansible-playbook -i ansible/inventories/single-node/hosts.ini ansible/playbooks/create-k8s-secrets.yml
ansible-playbook -i ansible/inventories/single-node/hosts.ini ansible/playbooks/deploy-k3s.yml
```

## Cluster

```bash
cp ansible/inventories/cluster/hosts.ini.example ansible/inventories/cluster/hosts.ini
cp ansible/vars/secrets.example.yml ansible/vars/secrets.yml
ansible-playbook -i ansible/inventories/cluster/hosts.ini ansible/playbooks/install-k3s-server.yml
ansible-playbook -i ansible/inventories/cluster/hosts.ini ansible/playbooks/install-k3s-agents.yml
ansible-playbook -i ansible/inventories/cluster/hosts.ini ansible/playbooks/configure-kubeconfig.yml
ansible-playbook -i ansible/inventories/cluster/hosts.ini ansible/playbooks/create-k8s-secrets.yml
ansible-playbook -i ansible/inventories/cluster/hosts.ini ansible/playbooks/deploy-k3s.yml
```
