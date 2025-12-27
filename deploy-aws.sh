#!/bin/bash
set -e

# ============================================
# Yocto Builder - AWS Deployment Script
# ============================================
# This script provisions and deploys the Yocto Builder platform to AWS EC2
#
# Usage:
#   ./deploy-aws.sh                    # Provision new instance and deploy
#   ./deploy-aws.sh <instance-ip>       # Deploy to existing instance
#
# Prerequisites:
#   - Ansible installed (brew install ansible)
#   - AWS credentials in .env file
#   - SSH key pair created in AWS and saved to .secrets/
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if deploying to existing instance
EXISTING_INSTANCE="$1"

# ============================================
# Load Configuration
# ============================================
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Copy .env.example to .env and configure it:"
    echo "  cp .env.example .env"
    exit 1
fi

# Load environment variables
set -a
source .env
set +a

# ============================================
# Validate AWS Credentials
# ============================================
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}Error: AWS credentials not found in .env${NC}"
    echo "Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env"
    exit 1
fi

export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY
export AWS_REGION="${AWS_REGION:-ap-south-1}"
export AWS_EC2_INSTANCE_TYPE="${AWS_EC2_INSTANCE_TYPE:-m5.2xlarge}"
export AWS_EC2_KEY_NAME="${AWS_EC2_KEY_NAME}"
export AWS_EC2_KEY_PATH="${AWS_EC2_KEY_PATH:-.secrets/${AWS_EC2_KEY_NAME}.pem}"

# ============================================
# Check Prerequisites
# ============================================
if ! command -v ansible-playbook &> /dev/null; then
    echo -e "${RED}Error: Ansible is not installed${NC}"
    echo "Install with: brew install ansible"
    echo "Then install dependencies: cd ansible && ./install-dependencies.sh"
    exit 1
fi

# Verify SSH key exists
if [ ! -f "$AWS_EC2_KEY_PATH" ]; then
    echo -e "${RED}Error: SSH key not found at $AWS_EC2_KEY_PATH${NC}"
    echo "Create the key pair in AWS EC2 and save the private key to .secrets/"
    exit 1
fi

chmod 600 "$AWS_EC2_KEY_PATH"

# ============================================
# Deploy to Existing Instance
# ============================================
if [ -n "$EXISTING_INSTANCE" ]; then
    echo -e "${GREEN}Deploying to existing instance: $EXISTING_INSTANCE${NC}"
    
    # Update inventory with absolute path
    ABS_KEY_PATH="$(cd "$(dirname "$AWS_EC2_KEY_PATH")" && pwd)/$(basename "$AWS_EC2_KEY_PATH")"
    cat > ansible/inventory/aws-ec2-static.yml << EOF
all:
  children:
    aws_ec2_instances:
      hosts:
        yocto-builder:
          ansible_host: $EXISTING_INSTANCE
          ansible_user: ec2-user
          ansible_ssh_private_key_file: $ABS_KEY_PATH
          public_ip: $EXISTING_INSTANCE
EOF

    # Test SSH connection
    echo "Testing SSH connection..."
    if ! ssh -i "$AWS_EC2_KEY_PATH" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ec2-user@$EXISTING_INSTANCE "echo 'SSH OK'" 2>/dev/null; then
        echo -e "${RED}Error: Cannot SSH to instance${NC}"
        echo "Check:"
        echo "  1. Instance is running"
        echo "  2. Security group allows SSH from your IP"
        echo "  3. SSH key is correct"
        exit 1
    fi

    # Deploy (update existing deployment)
    cd ansible
    ansible-playbook -i inventory/aws-ec2-static.yml playbooks/aws-deploy.yml
    
    echo ""
    echo -e "${GREEN}Deployment complete!${NC}"
    echo "Access: http://$EXISTING_INSTANCE"
    exit 0
fi

# ============================================
# Provision New Instance
# ============================================
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}AWS EC2 Deployment for Yocto Builder${NC}"
echo -e "${GREEN}==========================================${NC}"
echo "Region: $AWS_REGION"
echo "Instance Type: $AWS_EC2_INSTANCE_TYPE"
echo "Key Name: $AWS_EC2_KEY_NAME"
echo ""

# Use the full deployment playbook which handles both provisioning and deployment
echo -e "${YELLOW}Starting full deployment (provision + deploy)...${NC}"
cd ansible
ansible-playbook playbooks/aws-full-deploy.yml

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Deployment failed${NC}"
    exit 1
fi

# Step 4: Display results
if [ -f .aws-instance-info ]; then
    source .aws-instance-info
    echo ""
    echo -e "${GREEN}==========================================${NC}"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo -e "${GREEN}==========================================${NC}"
    echo "Instance ID: $instance_id"
    echo "Public IP: $public_ip"
    echo ""
    echo "Access the application:"
    echo "  http://$public_ip"
    echo ""
    echo "SSH to the instance:"
    echo "  ssh -i $AWS_EC2_KEY_PATH ec2-user@$public_ip"
    echo ""
    echo -e "${YELLOW}Note: SSL certificate will be configured automatically${NC}"
    echo -e "${YELLOW}      or run certbot manually for custom domain${NC}"
fi
