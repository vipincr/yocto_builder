# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  # Detect host architecture
  is_arm_host = RUBY_PLATFORM.include?("arm64") || RUBY_PLATFORM.include?("aarch64")
  
  if is_arm_host
    # ARM Mac - use ARM64 Ubuntu box (VirtualBox 7.1+ required for native ARM64 support)
    # net9/ubuntu-24.04-arm64 is a verified ARM64 box for VirtualBox 7.1+ on ARM Macs
    config.vm.box = "net9/ubuntu-24.04-arm64"
    config.vm.box_version = ">= 1.1"
    config.vm.box_check_update = true
    
    config.vm.provider "virtualbox" do |vb|
      vb.name = "yoctobuilder"
      vb.memory = "4096"  # 4GB for development
      vb.cpus = 2
      vb.customize ["modifyvm", :id, "--ioapic", "on"]
      # Note: VirtualBox 7.1+ supports native ARM64 VMs on macOS/Arm
      # The box itself is ARM64, so no architecture customization needed
    end
  else
    # x86_64 host - use native x86_64 box
    config.vm.box = "ubuntu/jammy64"
    config.vm.box_check_update = true
    
    config.vm.provider "virtualbox" do |vb|
      vb.name = "yoctobuilder"
      vb.memory = "4096"  # 4GB for development
      vb.cpus = 2
      vb.customize ["modifyvm", :id, "--ioapic", "on"]
    end
  end

  # Network configuration
  # IMPORTANT: Port forwarding must be defined BEFORE private_network
  # to ensure NAT adapter (adapter 1) is configured first
  config.vm.network "forwarded_port", guest: 3000, host: 3000, host_ip: "127.0.0.1", auto_correct: true
  config.vm.network "forwarded_port", guest: 5432, host: 5433, host_ip: "127.0.0.1"  # PostgreSQL
  
  # Private network (adapter 2) - host-only network for direct access from host
  # This creates a second adapter that allows direct IP access
  config.vm.network "private_network", ip: "192.168.56.10"

  # Sync project directory
  config.vm.synced_folder ".", "/vagrant"

  # Pre-provision: Install Python3 (required for Ansible to connect via SSH)
  config.vm.provision "shell", inline: <<-SHELL
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq python3 python3-minimal
  SHELL

  # Post-provision script
  config.vm.provision "shell", inline: <<-SHELL
    # Wait for services to be ready
    echo "Waiting for services to start..."
    sleep 10
    
    # Check service status
    systemctl is-active --quiet postgresql && echo "✓ PostgreSQL is running" || echo "✗ PostgreSQL is not running"
    systemctl is-active --quiet docker && echo "✓ Docker is running" || echo "✗ Docker is not running"
    
    # Check PM2
    sudo -u yocto pm2 list || echo "PM2 not running yet"
    
    echo ""
    echo "=========================================="
    echo "YoctoBuilder Vagrant Setup Complete!"
    echo "=========================================="
    echo "Application should be available at:"
    echo "  http://localhost:3000"
    echo "  http://192.168.56.10:3000"
    echo ""
    echo "SSH into the VM:"
    echo "  vagrant ssh"
    echo ""
    echo "Check PM2 status:"
    echo "  vagrant ssh -c 'sudo -u yocto pm2 list'"
    if [[ "$(uname -m)" == "arm64" ]] || [[ "$(uname -m)" == "aarch64" ]]; then
      echo ""
      echo "Note: Running native ARM64 Ubuntu VM on ARM Mac"
    fi
  SHELL
end
