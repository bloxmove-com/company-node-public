#!/bin/sh
export ENV="local A"
export apiKey=83jklolTL!-local-1
export fleetbackendBaseUrl=http://tenant1.localhost:2998
export fleetBackendUser=backend@tenant1.com
export fleetBackendPassword=init
export accountDID=did:ethr:blxm-local:0xaFaEDAC2fDF673Aaae21092B8994b4fEC5AAd829
export accountAddress=0xaFaEDAC2fDF673Aaae21092B8994b4fEC5AAd829
export accountPrivateKey=0xe83a0d9c50614d9ea4f95d11a8818bb58b88e3493bb6af02957cf1e1bb733cda
export accountPassword=FleetNodeA1.0
export backfillEnabled=true
export PORT=3000
export companyClaim='[{"@context":["https://www.w3.org/2018/credentials/v1"],"type":["VerifiableCredential","CompanyCredential"],"credentialSubject":{"id":"did:ethr:blxm-local:0xaFaEDAC2fDF673Aaae21092B8994b4fEC5AAd829","company":true},"issuer":"did:ethr:blxm-local:0xB67362Af7e205Cf76B393781DD28EE07AE7BB36D","issuanceDate":"2021-12-10T09:24:01.463Z","proof":{"type":"EcdsaSecp256k1RecoveryMethod2020","proofPurpose":"assertionMethod","verificationMethod":"did:ethr:blxm-local:0xB67362Af7e205Cf76B393781DD28EE07AE7BB36D#controller","created":"2021-12-10T09:24:01.451Z","proofValue":"0x40328f8770ee4ded6a5a2fdecb7544ea43293eed97b4df2b586a0a0d02af130428f954b08d12e72dcb6ff94c274b55f884f93fe075f9789b7ab38c3ece04e0791c"}}]'