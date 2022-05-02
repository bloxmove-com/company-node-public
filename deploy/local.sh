#!/bin/bash
set -e

# This shell script will build, tag and push your service image to a local registry and install the service via helm

# Usage: 
# Place the script in your /deploy directory 
# Enter your service tag down below
# chmod +x local.sh
# ./local.sh -i <your-vagrant-id>

CURRENT_DIR_PATH=${PWD}

SERVICE_DIR_PATH="$(dirname "$CURRENT_DIR_PATH")"
SERVICE_DIR=${SERVICE_DIR_PATH##*/}

# Enter your service tag here
SERVICE_TAG=fleet-node

printHelp() {
  echo "Usage: "
  echo "  local.sh [-i <global_vm_id>]"
  echo "    -i <global_vm_id> - the vm the commands will run on"
  echo "    -h - Print this message"
}

mountRepo() {
    echo "===================== Mounting ====================="
    echo "  Mounting Repo to Virtual Machine                  "
    echo "===================================================="

    VBoxManage sharedfolder add "bloxmove_local_cluster" --name $SERVICE_TAG --hostpath "$SERVICE_DIR_PATH" --readonly --transient

    vagrant ssh $VM_ID -- -t "mkdir /home/vagrant/vboxshare/$SERVICE_TAG"

    vagrant ssh $VM_ID -- -t "sudo mount -t vboxsf -o uid=1000,gid=1000 $SERVICE_TAG /home/vagrant/vboxshare/$SERVICE_TAG"    

    vagrant ssh $VM_ID -- -t 'cd /var/run; sudo chmod 666 /var/run/docker.sock'
}

 buildAndPush() {
    echo "=================== BUILD & PUSH ==================="
    echo "  Building & Pushing to remote repository           "
    echo "===================================================="

    vagrant ssh $VM_ID -- -t "cd /home/vagrant/vboxshare/$SERVICE_TAG; docker image build -t 127.0.0.1:5000/$SERVICE_TAG --build-arg NPM_TOKEN=${NPM_TOKEN} ."

    vagrant ssh $VM_ID -- -t "cd /home/vagrant/vboxshare/$SERVICE_TAG; docker push 127.0.0.1:5000/$SERVICE_TAG" 
}

createNamespace() {
    echo "================ CREATING NAMESPACE ================"
    echo "  Creating service namespace                        "
    echo "===================================================="
    vagrant ssh $VM_ID -- -t "cd /home/vagrant/; kubectl create namespace $SERVICE_TAG --dry-run -o yaml | kubectl apply -f -"
}

installService() {
    echo "=================== INSTALLING SERVICE ============="
    echo "  Running Helm Upgrade                              "
    echo "===================================================="

    vagrant ssh $VM_ID -- -t "cd /home/vagrant/vboxshare/$SERVICE_TAG/deploy; helm upgrade --install $SERVICE_TAG-1 . -f values.local.1.yaml --namespace $SERVICE_TAG"
    vagrant ssh $VM_ID -- -t "cd /home/vagrant/vboxshare/$SERVICE_TAG/deploy; helm upgrade --install $SERVICE_TAG-2 . -f values.local.2.yaml --namespace $SERVICE_TAG"

    echo "=================== ACCESSING SERVICE =============="
    echo "  The Service will be accessible in a few secondes  "
    echo "  You can access it under:                          "
    echo "  http://localhost:8780/$SERVICE_TAG-1/api/         "
    echo "  http://localhost:8780/$SERVICE_TAG-2/api/         "  
    echo "===================================================="
}

removeRepo () {
    echo "================== REMOVING REPOSITORY ============="
    echo "  Removing shared repository folder                 "
    echo "===================================================="   

    vagrant ssh $VM_ID -- -t "sudo umount $SERVICE_TAG  || true"

    vagrant ssh $VM_ID -- -t "cd /home/vagrant/vboxshare; rm -rf $SERVICE_TAG" || true 

    VBoxManage sharedfolder remove "bloxmove_local_cluster" --name $SERVICE_TAG --transient || true
 }


while getopts "h?i:" opt
do
   case "$opt" in
       i) VM_ID=$OPTARG
          removeRepo
          mountRepo
          buildAndPush
          createNamespace
          installService
          removeRepo
       ;;
       h | *) printHelp
       exit
       ;;
   esac
done

if [ -z "$*" ]; then
    printHelp
fi