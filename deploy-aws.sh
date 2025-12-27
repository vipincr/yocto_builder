#!/bin/bash
set -e

# AWS Deployment Script for Yocto Builder
# This script provisions an EC2 instance and deploys the application

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if Ansible is installed
if ! command -v ansible-playbook &> /dev/null; then
    echo "Error: Ansible is not installed."
    echo "Install with: brew install ansible"
    exit 1
fi

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Loading AWS credentials from .env file..."
    if [ -f .env ]; then
        export $(grep -E '^AWS_' .env | xargs)
    else
        echo "Error: .env file not found and AWS credentials not set in environment"
        exit 1
    fi
fi

# Verify SSH key exists
SSH_KEY="${AWS_EC2_KEY_PATH:-.secrets/ec2_vipinr.pem}"
if [ ! -f "$SSH_KEY" ]; then
    echo "Error: SSH key not found at $SSH_KEY"
    exit 1
fi

# Set permissions on SSH key
chmod 600 "$SSH_KEY"

# Export AWS credentials for Ansible
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
export AWS_REGION="${AWS_REGION:-ap-south-1}"
export AWS_EC2_INSTANCE_TYPE="${AWS_EC2_INSTANCE_TYPE:-m5.2xlarge}"
export AWS_EC2_KEY_NAME="${AWS_EC2_KEY_NAME:-ec2_vipinr}"
export AWS_EC2_KEY_PATH="$SSH_KEY"

echo "=========================================="
echo "AWS EC2 Deployment for Yocto Builder"
echo "=========================================="
echo "Region: $AWS_REGION"
echo "Instance Type: $AWS_EC2_INSTANCE_TYPE"
echo "Key Name: $AWS_EC2_KEY_NAME"
echo ""

# Step 1: Provision EC2 instance
echo "Step 1: Provisioning EC2 instance..."
cd ansible
ansible-playbook -i inventory/aws-ec2-static.yml playbooks/aws-provision.yml

if [ $? -ne 0 ]; then
    echo "Error: EC2 provisioning failed"
    exit 1
fi

# Step 2: Update inventory with actual IP
if [ -f .aws-instance-info ]; then
    source .aws-instance-info
    if [ -n "$public_ip" ]; then
        echo "Updating inventory with public IP: $public_ip"
        sed -i.bak "s/PLACEHOLDER_IP/$public_ip/" inventory/aws-ec2-static.yml
    fi
fi

# Step 3: Deploy application
echo ""
echo "Step 2: Deploying application to EC2..."
ansible-playbook -i inventory/aws-ec2-static.yml playbooks/aws-deploy.yml

if [ $? -ne 0 ]; then
    echo "Error: Application deployment failed"
    exit 1
fi

# Step 4: Display connection information
if [ -f .aws-instance-info ]; then
    source .aws-instance-info
    echo ""
    echo "=========================================="
    echo "Deployment Complete!"
    echo "=========================================="
    echo "Instance ID: $instance_id"
    echo "Public IP: $public_ip"
    echo ""
    echo "Access the application at:"
    echo "  https://$public_ip"
    echo ""
    echo "SSH to the instance:"
    echo "  ssh -i $SSH_KEY ubuntu@$public_ip"
    echo ""
    echo "Note: SSL certificate will be automatically configured"
    echo "      on first access or you can run certbot manually"
fi

