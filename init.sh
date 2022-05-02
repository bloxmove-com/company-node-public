#!/bin/bash

# Caution: we need to add .npmrc file (with github token) manually under fleet-node folder now, until @bloxmove-com/did-asset-library-nestjs become open-sourced
address="$1"
privateKey="$2"
# We use this keypair as a temporary solution, after vehicle authority become opensource, we should let user input their own kyc account keypair
kycIssuerAddress="0x49149Be70B113C72866dCe02Bb0349bB48e9CE49"
kycIssuerPrivateKey="0x5f9641cd231fe970aad267ae0195c2451afb0e820b4c4c778d28ef1f41f4c125"
# read -p "Enter Fleet Owner Address: " address
# read -p "Enter Fleet Owner PrivateKey: " privateKey
# read -p "Enter KYC Issuer Address: " kycIssuerAddress
# read -p "Enter KYC Issuer PrivateKey: " kycIssuerPrivateKey
echo
echo "Address and PrivateKey you provided as following:"
echo "Fleet Owner Address: ${address}"
echo "Fleet Owner PrivateKey: ${privateKey}"
#echo "KYC Issuer Address: ${kycIssuerAddress}"
#echo "KYC Issuer PrivateKey: ${kycIssuerPrivateKey}"
echo
read -n 1 -p "Press enter to confirm or CTRL + C to escape..." INP

# install dependencies
if [ -f "./github_access_token" ]; then
  echo "Found ./github_access_token in the working directory."
  echo "Continue..."
else
  read -p "Enter your github person access token (at lease repo:clone, read:package permission needed): " github_access_token
  echo ${github_access_token} > ./github_access_token
fi

cp ./.npmrc.example ./.npmrc
github_access_token=`cat github_access_token`
perl -i -pe "s/<GitHub personal access token>/${github_access_token}/g" .npmrc

echo "Installing dependencies..."
docker run --rm --volume $PWD:/build node:16 sh -c "cd /build/ && npm install"
echo "done"

# call platform-services to create did
echo "Calling platform-services to create Fleet Owner did..."
fleetOwnerDid=`curl -s https://stablestage.kooltech.com.tw/platform-services/api/v1/identity/${address} -X POST`
echo fleetOwnerDid
fleetOwnerDid=${fleetOwnerDid:12}
fleetOwnerDid=${fleetOwnerDid%??}
echo "fleetOwnerDid: ${fleetOwnerDid}"
echo "done"

# set company verification
# create did for kyc issuer
echo "Calling platform-services to create DID for KYC issuer..."
kycIssuerDid=`curl -s https://stablestage.kooltech.com.tw/platform-services/api/v1/identity/${kycIssuerAddress} -X POST`
kycIssuerDid=${kycIssuerDid:12}
kycIssuerDid=${kycIssuerDid%??}
echo "kycIssuerDid: ${kycIssuerDid}"
echo "done"

if [ ! -d "./platform-deploy-test" ]; then
  git clone https://github.com/bloxmove-com/platform-deploy-test.git
else
  cd ./platform-deploy-test && git pull && cd ..
fi

cp .npmrc ./platform-deploy-test/.npmrc
docker build -t bloxmove/platform-deploy-test:stable -f ./platform-deploy-test/fleet-node-scripts/Dockerfile ./platform-deploy-test

companyClaim=`docker run --rm bloxmove/platform-deploy-test:stable node ./1_setCompanyVerification.js ${fleetOwnerDid} ${kycIssuerAddress} ${kycIssuerPrivateKey}`
companyClaim="${companyClaim##*$'\n'}"
companyClaim=${companyClaim:28}

# set service endpoint for fleet node
# TODO: ask user to input the url for fleet-node
fleetNodeEndpoint="http://localhost:3000/"
docker run --rm bloxmove/platform-deploy-test:stable node ./2_setServiceEndPoint.js $address $privateKey $fleetNodeEndpoint

# Prompts the user to save the following information
echo "address:"$address
echo "privateKey:"$privateKey
echo "fleetOwnerDid:"$fleetOwnerDid
echo "companyClaim:"$companyClaim
read -n 1 -p "Please save the information above before continue..." INP

function yes_no_prompt() {
  while true; do
      read -p "$1" yn
      case $yn in
          [Yy]* ) $2; break;;
          [Nn]* ) $3; break;;
          * ) $2; break;;
      esac
  done
}

function write_to_file() {
FILE="$1"
cat > ${FILE} <<- EOF
$2
EOF
}

read -r -d '' local_env <<- EOM
ENV=local
apiKey="sandbox"

# asset library config
web3Provider=https://stablestage.kooltech.com.tw/besu-validator1-rpc
chainId=1000
networkName=blxm-stable-stage
ipfsHost=stablestage.kooltech.com.tw
ipfsPort=443
ipfsProtocol=https
ipfsBasePath=/ipfs/api/v0
accountAddress=${address}
accountPrivateKey=${privateKey}
didRegistryAddress=0xe9Ed0193467607CdE5DF2150FB22bad50C0c78DB
attestationRegistryAddress=0x784Dc6cdb7d7e74e571Ff73ddF46917A67CBa7aC
ensAddress=0xd4aa5a98628Bc346676BAA87219C90997D785337
currentAccountDidMethod=ethr

# ontology config
ontId=did:ont:ARQfKAoLc9Wdg8gviZz3V9ViYyVSjLKteA
ontPrivateKeyWIF=L4o9iha8MTWefor1NK1meFjVSbGuDmet4wi2wUg9LYwLHLBGSWVy
ontPublicKeyIndex=1
ontNodeUrl=http://polaris1.ont.io:20334

# fleet node config
backfillEnabled=false
accessTokenExpirationSeconds=300
accessTokenVcMaxFutureExpirationInSeconds=10
kycIssuers=did:ethr:blxm-stable-stage:0xe20A10120d5e51130d95879A09888A33aE949346,did:ont:ALgcpQyKwudRKNnCZuUYjK47mqwZrzPNQG,did:web:doorman-pre-prod.wallet.eu.spherity.io:uuid:4f7d2251f7c34e829971a1ad8c41c6d2,$kycIssuerDid
esalePackageClaims=minAge18,driverLicense
backfillUpdateInterval=20000
timestampExpirationInSeconds=10
defaultZone=STUTTGART
accountDID=${fleetOwnerDid}
accountPassword=FleetNodeA1.0
PORT=3000
companyClaim=${companyClaim}

# connected endpoints
serviceCatalogAggregatorBaseUrl="temporarily_not_available_for_the_local_version"
serviceCatalogAggregatorApiKey="temporarily_not_available_for_the_local_version"

virtualCarWalletBaseUrl=https://stablestage.kooltech.com.tw/virtual-car-wallet
virtualCarWalletApiKey=stablestagevcw

vehicleAuthorityBaseUrl=https://stablestage.kooltech.com.tw/vehicle-authority
vehicleAuthorityVehicleParentDomain=vin.bloxmove

fleetbackendBaseUrl="temporarily_not_available_for_the_local_version"
fleetBackendUser="temporarily_not_available_for_the_local_version"
fleetBackendPassword="temporarily_not_available_for_the_local_version"

bloxmoveTompGatewayBaseUrl=http://localhost:2900
EOM

read -r -d '' dockerfile_sandbox << EOM
FROM node:16-alpine

WORKDIR /app

EXPOSE 3000

CMD npm start
EOM

read -r -d '' docker_compose << EOM
version: '3.2'

services:

  fleet-node:
    build:
      context: .
      dockerfile: Dockerfile.sandbox
    container_name: fleet-node-local-A
    ports:
      - 3000:3000
    volumes:
      # Mount source-code for development
      - ./:/app
    environment:
      - ENV="local A"
EOM

# Overwrite local.env
if [ -f "./configurations/local.env" ]; then
  yes_no_prompt "There is an existing local.env file. Do you want to overwrite it? [y/n] " \
                $(write_to_file "./configurations/local.env" "${local_env}") \
                ""
else
  write_to_file "./configurations/local.env" "${local_env}"
fi

# write to Dockerfile.sandbox
write_to_file "./Dockerfile.sandbox" "${dockerfile_sandbox}"

# write to docker-compose.yml file
write_to_file "./docker-compose.yml" "${docker_compose}"

# start fleet-node
#yes_no_prompt "Do you want to start fleet-node now? [y/n] " \
#              "echo starting fleet-node..." \
#              exit
docker-compose up -d

# Prompts the user the service has been started
echo ""
echo "---------------------------------------------------------------------------"
echo "fleet-node service started, open http://localhost:3000/api/ to visit, apiKey is 'sandbox'"
echo "---------------------------------------------------------------------------"

