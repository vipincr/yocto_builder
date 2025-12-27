#!/bin/bash
# Install Ansible and AWS dependencies

set -e

echo "Installing Ansible and AWS dependencies..."

# Check if running on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Check if Homebrew is installed
    if ! command -v brew &> /dev/null; then
        echo "Error: Homebrew is required. Install from https://brew.sh"
        exit 1
    fi
    
    # Install Ansible
    if ! command -v ansible &> /dev/null; then
        echo "Installing Ansible via Homebrew..."
        brew install ansible
    else
        echo "Ansible already installed"
    fi
    
    # Install Python dependencies
    echo "Installing Python dependencies..."
    python3 -m pip install --user boto3 botocore || {
        echo "Warning: Could not install boto3/botocore. You may need to use a virtual environment."
    }
else
    # Linux installation
    if ! command -v ansible &> /dev/null; then
        echo "Installing Ansible..."
        sudo apt-get update
        sudo apt-get install -y ansible python3-pip
    fi
    
    pip3 install --user boto3 botocore
fi

# Install Ansible collections
echo "Installing Ansible AWS collections..."
cd "$(dirname "$0")"
ansible-galaxy collection install -r requirements.yml

echo ""
echo "Installation complete!"
echo ""
echo "Next steps:"
echo "1. Ensure AWS credentials are in .env file"
echo "2. Verify SSH key exists at .secrets/ec2_vipinr.pem"
echo "3. Run: ./deploy-aws.sh"

