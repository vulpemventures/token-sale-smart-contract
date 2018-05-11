# token-sale-smart-contract
Token Sale smart contracts with Tiers, Soft Cap, Hard Cap, KYC Whitelist &amp; Blacklist

## Features

* Time-based tiers to incentivize the sale to close as fast as possible
* Equal distribution among contributors with a fixed personal firt day cap  
* On-chain Whitelist and Blacklist to restrict to allowed contributor to avoid legal issues.
* Finalizable: Amdin super-power ante and post sale
* Flush tokens sent to smart contract address
* Clean: concise code, easy to read.
* Tested: Coverage > 90%, used in mainnet multiple times securing hundred of thousands ethers
* Careful: Two person approval process for small, focused pull requests.
* Secure: PGP signed releases

## Used in production

* [SingularityNET - AGI](https://singularitynet.io)
* [DataWallet - DXT](https://datawallet.com)

# Workflow

1) Deploy `Token` contract with `name`, `symbol`, `decimals`, `initialSupply`
2) Deploy Crowdsale contract of choice (`FirstDayCappedCrowdsale` or `TieredCrowdsale`)
3) Deploy `Airdrop`and transfer the presale supply
4) Call `transfer` inside Token with Crowdsale as recipient 
5) Call `pause` inside Token
6) Call `transferOwnership` inside Token contract with Crowdsale as new owner
7) Call `updateWhitelist` inside Crowdsale Contract

After the sale

7) Call `finalize` inside Crowdsale Contract

# Usage

Install 

```javascript
npm install https://github.com/vulpemventures/token-sale-smart-contract
```

Require it

```javascript

const CompiledTokenContract = require("token-sale-smart-contract/build/contracts/Token.json")

```

Use it

```javascript

const { abi, bytecode } = CompiledTokenContract

const contractInstance = web3.eth.Contract(abi)
...

```

# Development

### Requirements

* Node/npm > 7.6

### Install

`npm i`

### Run tests

`npm run test`

### Compile contracts 

`npm run compile`

### Deploy to public networks

`npm run deploy`

### Flatten

`npm run flat`

# License [MIT](https://github.com/vulpemventures/token-sale-smart-contract/blob/master/LICENSE)
