const Crowdsale = artifacts.require("FirstDayCappedCrowdsale")
const Token = artifacts.require("Token")

function latestTime() {
  return web3.eth.getBlock('latest').timestamp
}

const duration = {
  seconds: function (val) { return val },
  minutes: function (val) { return val * this.seconds(60) },
  hours: function (val) { return val * this.minutes(60) },
  days: function (val) { return val * this.hours(24) },
  weeks: function (val) { return val * this.days(7) },
  years: function (val) { return val * this.days(365) }
}

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Token)
    .then(() => Token.deployed())
    .then(() => {
      const startTime = latestTime() + duration.minutes(5)
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