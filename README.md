# bloXmove Fleet-Node

![This is an image](bloxmove_colour.png)
# Introduction

This is a nest.js mono repository [Nest.js Monorepo](https://docs.nestjs.com/cli/monorepo).

The following apps are part of it:

- Fleet-Node
- CPO-Node


## Try it out with one-step script
The script `init.sh` helps you to set up a fleet node in Docker container easily. You can use your own account as the fleet owner by the command as follow:

* Prerequisites
    * 1 account key pairs for the Fleet Owner , you can create it by using MetaMask
    * Github developer token with at lease `repo:clone` and `package:read` permission enabled

```
chmod +x ./init.sh
# ./init.sh 0xc02c... f06254... 
./init.sh <fleetOwnerAddress> <fleetOwnerPrivateKey_without_0x>
```

# Detail setup 

## Prerequisites

- [Node.js v14.15.0](https://nodejs.org/en/)
- [Node Package Manager v6.14.15](https://www.npmjs.com/)
- [Docker](https://docs.docker.com/get-docker/)
- In order to install the private packages `@bloxmove-com/did-asset-library-nestjs` and `@bloxmove-com/verifiable-invoice`, a `.npmrc` is required. Best copy the `.npmrc.example` file and put in your personal GitHub access token (must have permission to at least read packages) at the respective placeholder.

# CPO-Node

## Setup local environment
**CPONode A** (Port: 2995)  
```
source ./scripts/local_cponode_a_env.sh
```

## Run

```
npm install

npm run start:cpo-node
//or in development mode
npm run start:cpo-node:dev

```

## Run unit tests
```
npm run test
```

# Fleet-Node

## Setup local environment
**FleetNode A** (Port: 3000)  
```
source ./scripts/local_fleetnode_a_env.sh

or for Windows:
scripts\local_fleetnode_a_env.bat
```

**FleetNode B** (Port: 2999)  
```
source ./scripts/local_fleetnode_b_env.sh

or for Windows:
scripts\local_fleetnode_b_env.bat
```

**FleetNode C (TOMP)** (Port: 2995)  
```
source ./scripts/local_fleetnode_c_env.sh

or for Windows:
scripts\local_fleetnode_c_env.bat
```
## Run
```
npm install
npm run start
//or in development mode
npm run start:dev
```

## Run unit tests
```
npm run test
```

## Jenkins Credentials

The following variables need to be provided with the Jenkins instance to ensure the services functionality.

- fleet-node1-backend-user-`<env>`
- fleet-node1-backend-password-`<env>`
- fleet-node2-backend-user-`<env>`
- fleet-node2-backend-password-`<env>`
- fleet-node4-backend-user-`<env>`
- fleet-node4-backend-password-`<env>`
- fleet-node5-backend-user-`<env>`
- fleet-node5-backend-password-`<env>`
- fleet-node1-private-key-`<env>`
- fleet-node2-private-key-`<env>`
- fleet-node3-private-key-`<env>`
- fleet-node4-private-key-`<env>`
- fleet-node5-private-key-`<env>`
- fleet-node-vcw-apikey-`<env>`
- fleet-node-service-catalog-apikey-`<env>`
- fleet-node1-ont-private-key-`<env>`
- fleet-node2-ont-private-key-`<env>`
- fleet-node3-ont-private-key-`<env>`
- fleet-node4-ont-private-key-`<env>`
- fleet-node5-ont-private-key-`<env>`
- cpo-backend-api-key-`<env>`
- cpo-node1-private-key-`<env>`

additional variables that should already be set:

- fleet-node-kube-cacert-`<env>`
- fleet-node-kube-token-`<env>`
- kube-server-`<env>`
- kube-cluster-`<env>`
