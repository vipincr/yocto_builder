#!/bin/bash
set -euo pipefail

# ============================================
# Yocto Builder - Unified Deployment Script
# ============================================
# Default: Vagrant (VirtualBox) local VM + host-based Ansible deployment
#   ./deploy.sh
#
# AWS:
#   ./deploy.sh --aws
#
# Notes:
# - Next.js is built LOCALLY and uploaded (prebuilt tarball).
# - Vagrant VM is treated like any other Ansible inventory target (no Ansible inside VM).
# - AWS deploy reuses an existing EC2 instance by Name tag (instance_name, default yocto-builder).
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

MODE="vagrant"
SKIP_VAGRANT_UP=false

usage() {
  cat <<'EOF'
Usage:
  ./deploy.sh                 Deploy to Vagrant (default)
  ./deploy.sh --no-up         Deploy to existing Vagrant VM (skip vagrant up)
  ./deploy.sh --aws           Deploy to AWS (provision/reuse + deploy)

EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --aws)
      MODE="aws"
      shift
      ;;
    --no-up)
      SKIP_VAGRANT_UP=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $1${NC}" >&2
      usage
      exit 2
      ;;
  esac
done

ensure_cmd() {
  local cmd="$1"
  local install_hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo -e "${RED}Error: '$cmd' not found.${NC}" >&2
    echo -e "${YELLOW}${install_hint}${NC}" >&2
    return 1
  fi
  return 0
}

ensure_brew() {
  if ! command -v brew >/dev/null 2>&1; then
    echo -e "${RED}Homebrew is required on macOS for auto-install.${NC}" >&2
    echo "Install from: https://brew.sh" >&2
    return 1
  fi
  return 0
}

ensure_vagrant_virtualbox() {
  if command -v vagrant >/dev/null 2>&1 && command -v VBoxManage >/dev/null 2>&1; then
    return 0
  fi

echo -e "${YELLOW}Vagrant/VirtualBox missing; attempting to install...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    ensure_brew
    # VirtualBox is a cask; may require user approval in System Settings.
    brew install --cask virtualbox || true
    brew install vagrant || true
  else
    echo -e "${RED}Auto-install for this OS is not implemented.${NC}" >&2
    echo "Please install VirtualBox and Vagrant manually." >&2
    return 1
  fi

  ensure_cmd vagrant "Install with: brew install vagrant"
  ensure_cmd VBoxManage "Install with: brew install --cask virtualbox"
}

ensure_ansible_deps_vagrant() {
  # Vagrant deployment only needs ansible-playbook; avoid AWS dependency noise.
  ensure_cmd ansible-playbook "Install with: brew install ansible"
}

ensure_ansible_deps_aws() {
  # AWS deployment needs collections + boto3/botocore on the controller.
  if ! command -v ansible-playbook >/dev/null 2>&1; then
    echo -e "${YELLOW}Ansible missing; attempting to install via ansible/install-dependencies.sh...${NC}"
  fi
  (cd ansible && ./install-dependencies.sh)
}

deploy_vagrant() {
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${GREEN}Deploying to Vagrant VM${NC}"
  echo -e "${GREEN}==========================================${NC}"

  ensure_vagrant_virtualbox
  ensure_ansible_deps_vagrant

  if [[ "$SKIP_VAGRANT_UP" == "false" ]]; then
    if vagrant status 2>/dev/null | grep -qE "running"; then
      echo -e "${YELLOW}Vagrant VM already running; skipping vagrant up.${NC}"
    else
      vagrant up
    fi
  fi

  echo -e "${YELLOW}Waiting for VM SSH to be ready...${NC}"
  local max_attempts=30
  local attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    if vagrant ssh -c "echo 'VM ready'" >/dev/null 2>&1; then
      break
    fi
    attempt=$((attempt + 1))
    sleep 2
  done
  if [[ $attempt -eq $max_attempts ]]; then
    echo -e "${RED}Error: VM did not become ready in time${NC}" >&2
    exit 1
  fi

  local ssh_key_path=".vagrant/machines/default/virtualbox/private_key"
  if [[ ! -f "$ssh_key_path" ]]; then
    echo -e "${RED}Error: Vagrant SSH key not found at $ssh_key_path${NC}" >&2
    exit 1
  fi
  chmod 600 "$ssh_key_path"

  local abs_key_path
  abs_key_path="$(cd "$(dirname "$ssh_key_path")" && pwd)/$(basename "$ssh_key_path")"

  cat > ansible/inventory/vagrant.yml <<EOF
---
all:
  children:
    vagrant_vms:
      hosts:
        yocto-builder:
          ansible_host: 127.0.0.1
          ansible_port: 2222
          ansible_user: vagrant
          ansible_ssh_private_key_file: $abs_key_path
          ansible_ssh_common_args: '-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null'
EOF

  echo -e "${YELLOW}Testing SSH connection to VM...${NC}"
  if ! ssh -i "$ssh_key_path" -p 2222 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 vagrant@127.0.0.1 "echo 'SSH OK'"; then
    echo -e "${RED}Error: Cannot SSH to VM${NC}" >&2
    exit 1
  fi

  (cd ansible && ansible-playbook -i inventory/vagrant.yml playbooks/deploy.yml -e platform=vagrant -e target_hosts=vagrant_vms)

  echo ""
  echo -e "${GREEN}Deployment Complete!${NC}"
  echo "Access:"
  echo "  http://localhost:3000"
  echo "  http://192.168.56.10:3000"
}

deploy_aws() {
  echo -e "${GREEN}==========================================${NC}"
  echo -e "${GREEN}Deploying to AWS EC2${NC}"
  echo -e "${GREEN}==========================================${NC}"

  ensure_ansible_deps_aws

  if [[ ! -f .env ]]; then
    echo -e "${RED}Error: .env file not found${NC}" >&2
    exit 1
  fi

  set -a
  # shellcheck disable=SC1091
  source .env
  set +a

  if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
    echo -e "${RED}Error: AWS credentials missing in .env${NC}" >&2
    exit 1
  fi

  export AWS_REGION="${AWS_REGION:-ap-south-1}"
  export AWS_EC2_INSTANCE_TYPE="${AWS_EC2_INSTANCE_TYPE:-m5.2xlarge}"

  if [[ -z "${AWS_EC2_KEY_NAME:-}" ]]; then
    echo -e "${RED}Error: AWS_EC2_KEY_NAME is missing in .env${NC}" >&2
    exit 1
  fi

  export AWS_EC2_KEY_PATH="${AWS_EC2_KEY_PATH:-.secrets/${AWS_EC2_KEY_NAME}.pem}"
  if [[ ! -f "$AWS_EC2_KEY_PATH" ]]; then
    echo -e "${RED}Error: SSH key not found at $AWS_EC2_KEY_PATH${NC}" >&2
    exit 1
  fi
  chmod 600 "$AWS_EC2_KEY_PATH"

  echo -e "${YELLOW}Building application locally...${NC}"
  ./scripts/build-and-package.sh
  if [[ ! -f yocto-builder-deploy.tar.gz ]]; then
    echo -e "${RED}Error: yocto-builder-deploy.tar.gz not created${NC}" >&2
    exit 1
  fi

  echo -e "${YELLOW}Starting full AWS deployment (provision/reuse + deploy)...${NC}"
  (cd ansible && ansible-playbook playbooks/aws-full-deploy.yml -e platform=aws)
}

case "$MODE" in
  vagrant)
    deploy_vagrant
    ;;
  aws)
    deploy_aws
    ;;
  *)
    echo -e "${RED}Unknown mode: $MODE${NC}" >&2
    exit 2
    ;;
esac


