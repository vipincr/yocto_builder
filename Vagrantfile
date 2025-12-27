# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "yocto-builder"

  # VM Resources - matching minimum requirements
  config.vm.provider "virtualbox" do |vb|
    vb.name = "yocto-builder"
    vb.memory = "4096"  # 4GB for testing (minimum is 32GB, but we'll use less for testing)
    vb.cpus = 4  # 4 CPUs for testing (minimum is 8)
  end

  # Network
  config.vm.network "forwarded_port", guest: 3000, host: 3000
  config.vm.network "forwarded_port", guest: 5432, host: 5433
  config.vm.network "forwarded_port", guest: 6379, host: 6380

  # Shared folders
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"

  # Provisioning
  config.vm.provision "shell", path: "vagrant/provision.sh", privileged: false
  config.vm.provision "shell", path: "vagrant/setup-app.sh", privileged: false

  # Enable Docker provider if available
  config.vm.provider "docker" do |d|
    d.image = "ubuntu:22.04"
    d.has_ssh = true
  end
end

