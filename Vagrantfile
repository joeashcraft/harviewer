# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  ## Lets lower the memory consumption some
  config.vm.provider :virtualbox do |virtualbox|
    virtualbox.customize ["modifyvm", :id, "--memory", "512"]
  end

  ## Every Vagrant virtual environment requires a box to build off of.
  config.vm.box = "ubuntu/trusty64"
  config.vm.network :forwarded_port, guest: 80, host: 8081
  config.vm.provision :shell, :inline => "apt-get update; apt-get upgrade; apt-get install -y ant nodejs npm openjdk-7; cd /vagrant; ant build;"
end
