const DURATION = {
  seconds: function(val) { return val},
  minutes: function(val) { return val * this.seconds(60) },
  hours:   function(val) { return val * this.minutes(60) },
  days:    function(val) { return val * this.hours(24) },
  weeks:   function(val) { return val * this.days(7) },
  years:   function(val) { return val * this.days(365)}
}

const constants = {
  NAME:"MyToken",
  SYMBOL: "MYT",
  DECIMALS: 8,
  INITIAL_SUPPLY:1000000000,
  duration: DURATION
}

module.exports = constants