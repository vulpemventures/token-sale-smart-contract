const Crowdsale = artifacts.require("FirstDayCappedCrowdsale")
const Token = artifacts.require("Token")


const { NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY, duration } = require('../test/helpers/constants')

module.exports = function(deployer, network, accounts) {
  deployer.deploy(
    Token,
    NAME,
    SYMBOL,
    DECIMALS,
    INITIAL_SUPPLY
  ).then(() => Token.deployed())
    .then(() => {
      const startTime = web3.eth.getBlock('latest').timestamp + duration.minutes(5)
      const endTime = startTime + duration.days(20)
      const rates = [ new web3.BigNumber(1000) ]
      const durations = [ endTime ]
      const wallet = web3.eth.accounts[0]
      const goal = new web3.BigNumber(3000 * Math.pow(10, 18))
      const cap = new web3.BigNumber(15000 * Math.pow(10, 18))
      const firstDayCap = new web3.BigNumber(5 * Math.pow(10, 18))

      return deployer.deploy(
        Crowdsale,
        Token.address,
        wallet,
        startTime,
        endTime,
        rates,
        durations,
        cap,
        goal,
        firstDayCap
      )
    })
    .then(() => Crowdsale.deployed())
};
