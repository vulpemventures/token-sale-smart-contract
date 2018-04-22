exports.latestTime = function () {
  return global.web3.eth.getBlock('latest').timestamp;
}
