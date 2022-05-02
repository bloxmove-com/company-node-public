pipeline {

    environment {
        npm_config_cache = 'npm-cache'
        projectTeam = 'blxm'
        registry = '069870223720.dkr.ecr.eu-central-1.amazonaws.com'
        registryUrl = "https://${registry}"
        registryProject = "${registry}/${projectTeam}"
        registryCredentials = 'ecr:eu-central-1:aws-ecr'
        NPM_TOKEN = credentials('npm-token')
        HOME = '.'
    }

    agent any

    parameters {
        choice(name: 'DEPLOY_ENV', choices: ['dev', 'uat'], description: 'Target environment for deployment')
        choice(name: 'NODE_TYPE', choices: ['cpo-node', 'fleet-node'], description: 'Company-Node-Type')
    }
    
    stages {
        stage('Build and unit test node app') {
            agent {
                docker {
                    image 'node:16-buster'
                }
            }
            steps {
                sh '''
                    echo //npm.pkg.github.com/:_authToken=$NPM_TOKEN > .npmrc
                    echo "@bloxmove-com:registry=https://npm.pkg.github.com" >> .npmrc
                    npm install
                    npm run test
                '''
            }
        }
        
        stage('Docker Build, Tag and Push (Fleet-Node)') {

            when {
                expression {
                    return params.NODE_TYPE == 'fleet-node';
                }
            }

            environment {
                // determine app version from package.json
                APP_VERSION = sh(script: 'cat package.json | grep "version" | awk \'{print $2}\' | sed s/\\"//g | sed s/,//g', , returnStdout: true).trim() 
                projectName = 'fleet-node'
            }
            steps {
                script {
                    sh 'echo //npm.pkg.github.com/:_authToken=$NPM_TOKEN > .npmrc'
                    sh 'echo "@bloxmove-com:registry=https://npm.pkg.github.com" >> .npmrc'
                    docker.withRegistry("${registryUrl}", "${registryCredentials}") {
                        def dockerImage = docker.build("${registryProject}/${projectName}:${env.APP_VERSION}", '--build-arg NPM_TOKEN=$NPM_TOKEN .')
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }

        stage('Docker Build, Tag and Push (CPO-Node)') {

            when {
                expression {
                    return params.NODE_TYPE == 'cpo-node';
                }
            }

            environment {
                // determine app version from package.json
                APP_VERSION = sh(script: 'cat package.json | grep "version" | awk \'{print $2}\' | sed s/\\"//g | sed s/,//g', , returnStdout: true).trim()
                projectName = 'cpo-node'
            }
            steps {
                script {
                    sh 'echo //npm.pkg.github.com/:_authToken=$NPM_TOKEN > .npmrc'
                    sh 'echo "@bloxmove-com:registry=https://npm.pkg.github.com" >> .npmrc'
                    docker.withRegistry("${registryUrl}", "${registryCredentials}") {
                        def dockerImage = docker.build("${registryProject}/${projectName}:${env.APP_VERSION}", '--build-arg NPM_TOKEN=$NPM_TOKEN -f Dockerfile.cpo-node .')
                        dockerImage.push()
                        dockerImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy Kubernetes artifacts (Fleet-Node)') {

            when {
                expression {
                    return params.NODE_TYPE == 'fleet-node';
                }
            }


            environment {
                // determine app version from package.json
                APP_VERSION = sh(script: 'cat package.json | grep "version" | awk \'{print $2}\' | sed s/\\"//g | sed s/,//g', , returnStdout: true).trim()
            }
            agent {
                docker {
                    image '069870223720.dkr.ecr.eu-central-1.amazonaws.com/blxm/helm-kubectl:3.5.4'
                    registryUrl "${registryUrl}"
                    registryCredentialsId "${registryCredentials}"
                }
            }
            steps {
                withCredentials([string(credentialsId: "fleet-node-kube-cacert-${params.DEPLOY_ENV}", variable: 'KUBE_CACERT'),
                            string(credentialsId: "fleet-node-kube-token-${params.DEPLOY_ENV}", variable: 'KUBE_TOKEN'),
                            string(credentialsId: "kube-server-${params.DEPLOY_ENV}", variable: 'KUBE_SERVER'),
                            string(credentialsId: "kube-cluster-${params.DEPLOY_ENV}", variable: 'KUBE_CLUSTER'),
                            string(credentialsId: "fleet-node-vcw-apikey-${params.DEPLOY_ENV}", variable: 'APIKEY_VCW'),
                            string(credentialsId: "fleet-node-service-catalog-apikey-${params.DEPLOY_ENV}", variable: 'APIKEY_SC'),
                            string(credentialsId: "fleet-node1-backend-user-${params.DEPLOY_ENV}", variable: 'FN1_BACKEND_USER'),
                            string(credentialsId: "fleet-node1-backend-password-${params.DEPLOY_ENV}", variable: 'FN1_BACKEND_PASS'),
                            string(credentialsId: "fleet-node2-backend-user-${params.DEPLOY_ENV}", variable: 'FN2_BACKEND_USER'),
                            string(credentialsId: "fleet-node2-backend-password-${params.DEPLOY_ENV}", variable: 'FN2_BACKEND_PASS'),
                            string(credentialsId: "fleet-node4-backend-user-${params.DEPLOY_ENV}", variable: 'FN4_BACKEND_USER'),
                            string(credentialsId: "fleet-node4-backend-password-${params.DEPLOY_ENV}", variable: 'FN4_BACKEND_PASS'),
                            string(credentialsId: "fleet-node5-backend-user-${params.DEPLOY_ENV}", variable: 'FN5_BACKEND_USER'),
                            string(credentialsId: "fleet-node5-backend-password-${params.DEPLOY_ENV}", variable: 'FN5_BACKEND_PASS'),
                            string(credentialsId: "fleet-node1-private-key-${params.DEPLOY_ENV}", variable: 'FN1_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node2-private-key-${params.DEPLOY_ENV}", variable: 'FN2_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node3-private-key-${params.DEPLOY_ENV}", variable: 'FN3_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node4-private-key-${params.DEPLOY_ENV}", variable: 'FN4_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node5-private-key-${params.DEPLOY_ENV}", variable: 'FN5_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node1-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN1_ONT_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node2-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN2_ONT_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node3-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN3_ONT_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node4-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN4_ONT_PRIVATE_KEY'),
                            string(credentialsId: "fleet-node5-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN5_ONT_PRIVATE_KEY')
                            ]) {
                sh '''
                    source /config/createKubeConfig.sh fleet-node-user $KUBE_TOKEN $KUBE_CACERT $KUBE_SERVER $KUBE_CLUSTER fleet-node
                    kubectl version
                    helm version
                    kubectl get pods
                    helm ls
                    cd deploy
                    helm upgrade --install fleet-node1 . -f values.$DEPLOY_ENV.1.yaml --set imageTag=$APP_VERSION --set virtualCarWalletApiKey=$APIKEY_VCW --set fleetBackendUser=$FN1_BACKEND_USER --set fleetBackendPassword=$FN1_BACKEND_PASS --set accountPrivateKey=$FN1_PRIVATE_KEY --set ontPrivateKeyWIF=$FN1_ONT_PRIVATE_KEY --set serviceCatalogAggregatorApiKey=$APIKEY_SC
                    helm upgrade --install fleet-node2 . -f values.$DEPLOY_ENV.2.yaml --set imageTag=$APP_VERSION --set virtualCarWalletApiKey=$APIKEY_VCW --set fleetBackendUser=$FN2_BACKEND_USER --set fleetBackendPassword=$FN2_BACKEND_PASS --set accountPrivateKey=$FN2_PRIVATE_KEY --set ontPrivateKeyWIF=$FN2_ONT_PRIVATE_KEY --set serviceCatalogAggregatorApiKey=$APIKEY_SC
                    helm upgrade --install fleet-node3 . -f values.$DEPLOY_ENV.3.yaml --set imageTag=$APP_VERSION --set virtualCarWalletApiKey=$APIKEY_VCW --set accountPrivateKey=$FN3_PRIVATE_KEY --set ontPrivateKeyWIF=$FN3_ONT_PRIVATE_KEY --set serviceCatalogAggregatorApiKey=$APIKEY_SC
                    helm upgrade --install fleet-node4 . -f values.$DEPLOY_ENV.4.yaml --set imageTag=$APP_VERSION --set virtualCarWalletApiKey=$APIKEY_VCW --set fleetBackendUser=$FN4_BACKEND_USER --set fleetBackendPassword=$FN4_BACKEND_PASS --set accountPrivateKey=$FN4_PRIVATE_KEY --set ontPrivateKeyWIF=$FN4_ONT_PRIVATE_KEY --set serviceCatalogAggregatorApiKey=$APIKEY_SC
                    helm upgrade --install fleet-node5 . -f values.$DEPLOY_ENV.5.yaml --set imageTag=$APP_VERSION --set virtualCarWalletApiKey=$APIKEY_VCW --set fleetBackendUser=$FN5_BACKEND_USER --set fleetBackendPassword=$FN5_BACKEND_PASS --set accountPrivateKey=$FN5_PRIVATE_KEY --set ontPrivateKeyWIF=$FN5_ONT_PRIVATE_KEY --set serviceCatalogAggregatorApiKey=$APIKEY_SC
                '''
                }
            }
        }


        stage('Deploy Kubernetes artifacts (CPO-Node)') {

            when {
                expression {
                    return params.NODE_TYPE == 'cpo-node';
                }
            }

            environment {
                // determine app version from package.json
                APP_VERSION = sh(script: 'cat package.json | grep "version" | awk \'{print $2}\' | sed s/\\"//g | sed s/,//g', , returnStdout: true).trim()
            }
            agent {
                docker {
                    image '069870223720.dkr.ecr.eu-central-1.amazonaws.com/blxm/helm-kubectl:3.5.4'
                    registryUrl "${registryUrl}"
                    registryCredentialsId "${registryCredentials}"
                }
            }
            steps {
                withCredentials([string(credentialsId: "fleet-node-kube-cacert-${params.DEPLOY_ENV}", variable: 'KUBE_CACERT'),
                            string(credentialsId: "fleet-node-kube-token-${params.DEPLOY_ENV}", variable: 'KUBE_TOKEN'),
                            string(credentialsId: "kube-server-${params.DEPLOY_ENV}", variable: 'KUBE_SERVER'),
                            string(credentialsId: "kube-cluster-${params.DEPLOY_ENV}", variable: 'KUBE_CLUSTER'),
                            string(credentialsId: "cpo-node1-private-key-${params.DEPLOY_ENV}", variable: 'CPO_NODE1_PRIVATE_KEY'),
                            string(credentialsId: "cpo-backend-api-key-${params.DEPLOY_ENV}", variable: 'CPO_BACKEND_API_KEY'),
                            string(credentialsId: "fleet-node5-ont-private-key-${params.DEPLOY_ENV}", variable: 'FN5_ONT_PRIVATE_KEY')
                            ]) {
                sh '''
                    source /config/createKubeConfig.sh fleet-node-user $KUBE_TOKEN $KUBE_CACERT $KUBE_SERVER $KUBE_CLUSTER fleet-node
                    kubectl version
                    helm version
                    kubectl get pods
                    helm ls
                    cd deploy
                    helm upgrade --install cpo-node1 . -f values.cpo-node.$DEPLOY_ENV.1.yaml --set imageTag=$APP_VERSION  --set accountPrivateKey=$CPO_NODE1_PRIVATE_KEY --set ontPrivateKeyWIF=$FN5_ONT_PRIVATE_KEY --set cpoBackendApiKey=$CPO_BACKEND_API_KEY
                '''
                }
            }
        }
    }
}