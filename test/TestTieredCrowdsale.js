const Crowdsale = artifacts.require('TieredCrowdsale.sol')
const Token = artifacts.require('Token.sol')

const { NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY, duration } = require('./helpers/constants')
const PUBLIC_SUPPLY = new web3.BigNumber((INITIAL_SUPPLY/2) * Math.pow(10, 8))

const Vault = artifacts.require('RefundVault.sol')

const { latestTime } = require('./helpers/latestTime')
const { increaseTimeTo } = require('./helpers/increaseTime')

require('chai')
.use(require('chai-as-promised'))
.should()

contract('Tier Crowdsale', async ([miner, firstContributor, secondContributor, whitelisted, blacklisted, wallet]) => {

  beforeEach(async () => {
    try {
      this.token = await Token.new(NAME, SYMBOL, DECIMALS, INITIAL_SUPPLY, { from: miner })    
    } catch (e){
      console.log(e)
    }
    const startTime = latestTime() + duration.hours(10)
    const endTime = startTime + duration.weeks(1)
    const goal = new web3.BigNumber(3 * Math.pow(10, 18))
    const cap = new web3.BigNumber(15 * Math.pow(10, 18))
    const rates = [
      new web3.BigNumber(1200),
      new web3.BigNumber(1150),
      new web3.BigNumber(1100),
      new web3.BigNumber(1000)
    ]
    const durations = [
      startTime + duration.days(1),
      startTime + duration.days(2),
      startTime + duration.days(3),
      endTime
    ]

    this.crowdsale = await Crowdsale.new(this.token.address, wallet, startTime, endTime, rates, durations, cap, goal, { from: miner })
    
    await this.token.pause({ from: miner })
    await this.token.transfer(this.crowdsale.address, PUBLIC_SUPPLY, { from: miner })
    
    await this.token.transferOwnership(this.crowdsale.address, { from: miner })
    await this.crowdsale.updateWhitelist([firstContributor, secondContributor], true, { from: miner })
  })

  describe('initialization', () => {

    it('goal should be 3 ETH', async () => {
      const goal = await this.crowdsale.goal()

      assert.equal(goal.toNumber(), web3.toWei(3, 'ether'), "goal is incorrect")
    })

    it('cap should be 15 ETH', async () => {
      const cap = await this.crowdsale.cap()

      assert.equal(cap.toNumber(), web3.toWei(15, 'ether'), "cap is incorrect")
    })

    it('first tier bonus should be equal to 20% and lasts 1 day', async () => {
      const firstTier = await this.crowdsale.rates(0)

      assert.equal(firstTier.toNumber(), 1200, "first tier is incorrect")

      const startTime = new Date(await this.crowdsale.startTime() * 1000)
      const firstTierDuration = new Date(await this.crowdsale.tiersDuration(0) * 1000)
      const timeDiff = Math.abs(firstTierDuration.getTime() - startTime.getTime())

      assert.equal(Math.ceil(timeDiff / (1000 * 3600)), 24, 'should be 24 hours')
    })
    
    it('second tier bonus should be equal to 15% and lasts 1 day', async () => {
      const secondTier = await this.crowdsale.rates(1)

      assert.equal(secondTier.toNumber(), 1150, "second tier is incorrect")

      const firstTierDuration = new Date(await this.crowdsale.tiersDuration(0) * 1000)
      const secondTierDuration = new Date(await this.crowdsale.tiersDuration(1) * 1000)
      const timeDiff = Math.abs(secondTierDuration.getTime() - firstTierDuration.getTime())

      assert.equal(Math.ceil(timeDiff / (1000 * 3600)), 24, 'should be 24 hours')
    })
    
    it('third tier bonus should be equal to 10%', async () => {
      const thirdTier = await this.crowdsale.rates(2)

      assert.equal(thirdTier.toNumber(), 1100, "third tier is incorrect")

      const secondTierDuration = new Date(await this.crowdsale.tiersDuration(1) * 1000)
      const thirdTierDuration = new Date(await this.crowdsale.tiersDuration(2) * 1000)
      const timeDiff = Math.abs(thirdTierDuration.getTime() - secondTierDuration.getTime())

      assert.equal(Math.ceil(timeDiff / (1000 * 3600)), 24, 'should be 24 hours')
    })

    it('standard conversion rate should be equal to 1000 and lasts till the end of the sale', async () => {
      const standardRate = await this.crowdsale.rates(3)

      assert.equal(standardRate.toNumber(4), 1000, "standard rate is incorrect")

      const endTime = await this.crowdsale.endTime()
      const stdRateDuration = await this.crowdsale.tiersDuration(3)

      assert.equal(endTime.toNumber(), stdRateDuration.toNumber(), 'should be equal')
    })

    it('crowdsale contract should be the owner of AGI token', async () => {
      assert.equal(await this.token.owner(), this.crowdsale.address, 'Crowdsale is not the owner of the token')
    })

    it('should not be finalized', async () => {
      const isFinalized = await this.crowdsale.isFinalized()

      assert.isFalse(isFinalized, "isFinalized should be false")
    })

    it('tokens should be paused', async () => {
      assert.isTrue(await this.token.paused(), "token should be paused")
    })

    it('check the balances just after deploy and after crowdsale initialization', async () => {
      assert.equal((await this.token.balanceOf(miner)).toNumber(), PUBLIC_SUPPLY, "The miner should hold presale ")
      assert.equal((await this.token.balanceOf(this.crowdsale.address)).toNumber(), PUBLIC_SUPPLY, "The Crowdsale should hold the rest")
    })

    it('only the owner should be able to change the rate', async () => {
      const newRate = new web3.BigNumber(2000)

      await this.crowdsale.changeRate(3, newRate, { from: miner })

      const rate = await this.crowdsale.rates(3)

      assert.equal(newRate.toNumber(), rate.toNumber(), 'should be equal to' + newRate)

      try {
        await this.crowdsale.changeRate(3, newRate, { from: firstContributor })

        assert.fail('should have thrown before')
      } catch(error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }
    })

  })

  describe('whitelist', async () => {

    it('should add two contributors into the whitelist', async () => {
      await this.crowdsale.updateWhitelist([whitelisted, blacklisted], true)

      assert.isTrue(await this.crowdsale.isWhitelisted(whitelisted))
      assert.isTrue(await this.crowdsale.isWhitelisted(blacklisted))
    })

    it('should add and remove the same contributor in whitelist', async () => {
      await this.crowdsale.updateWhitelist([blacklisted], true)
      assert.isTrue(await this.crowdsale.isWhitelisted(blacklisted))

      await this.crowdsale.updateWhitelist([blacklisted], false)
      assert.isFalse(await this.crowdsale.isWhitelisted(blacklisted))
    })

    it('only owner can add and remove from whitelist', async () => {
      try {
        await this.crowdsale.updateWhitelist([firstContributor], true, { from: firstContributor })
        
        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }
    })
  })

  describe('sale', async () => {

    it('should not accept purchase before start', async () => {
      try {
        await this.crowdsale.sendTransaction({ value: new web3.BigNumber(web3.toWei(1, 'ether')), from: firstContributor })

        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }
    })

    it('should not accept purchase if cap has been reached', async () => {
      await increaseTimeTo(latestTime() + duration.days(2))

      const { logs } = await this.crowdsale.sendTransaction({ value: new web3.BigNumber(web3.toWei(16, 'ether')), from: secondContributor })          
      const event = logs.find(e => e.event === 'TokenRefund')

      assert.isNotNull(event)

      try {
        await this.crowdsale.sendTransaction({ value: new web3.BigNumber(web3.toWei(3, 'ether')), from: secondContributor })                
        
        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }
    })

    it('should accept payments during the sale and issue tokens based on tiers', async () => {
      const weiToCogs = new web3.BigNumber(Math.pow(10, -10))
      const weiAmount = new web3.BigNumber(web3.toWei(1, 'ether'))

      const firstTier = await this.crowdsale.rates(0)
      const secondTier = await this.crowdsale.rates(1)
      const thirdTier = await this.crowdsale.rates(2)
      const standardRate = await this.crowdsale.rates(3)

      const initialSupply = INITIAL_SUPPLY
      const startTime = await this.crowdsale.startTime()
      const endTime = await this.crowdsale.endTime()

      await this.crowdsale.updateWhitelist([ whitelisted, blacklisted ], true)

      // first tier
      await increaseTimeTo(latestTime() + duration.hours(20))

      let expectedTokenAmount = firstTier.mul(Math.pow(10, 8))
      await this.crowdsale.sendTransaction({ value: weiAmount, from: firstContributor })
      let finalTokenAmount = await this.token.balanceOf(firstContributor)

      assert.equal(finalTokenAmount.toNumber(), expectedTokenAmount.toNumber())

      // second tier
      await increaseTimeTo(latestTime() + duration.hours(26))

      expectedTokenAmount = secondTier.mul(Math.pow(10, 8))
      await this.crowdsale.sendTransaction({ value: weiAmount, from: secondContributor })
      finalTokenAmount = await this.token.balanceOf(secondContributor)

      assert.equal(finalTokenAmount.toNumber(), expectedTokenAmount.toNumber())

      // third tier
      await increaseTimeTo(latestTime() + duration.hours(16))

      expectedTokenAmount = thirdTier.mul(Math.pow(10, 8))
      await this.crowdsale.sendTransaction({ value: weiAmount, from: whitelisted })
      finalTokenAmount = await this.token.balanceOf(whitelisted)
      
      assert.equal(expectedTokenAmount.toNumber(), finalTokenAmount.toNumber())

      // standard rate
      await increaseTimeTo(latestTime() + duration.hours(20))

      expectedTokenAmount = standardRate.mul(Math.pow(10, 8))
      await this.crowdsale.sendTransaction({ value: weiAmount, from: blacklisted })
      finalTokenAmount = await this.token.balanceOf(blacklisted)

      assert.equal(expectedTokenAmount.toNumber(), finalTokenAmount.toNumber())
      
      assert.isFalse(await this.crowdsale.isFinalized(), "isFinalized should be false")   
    })

    it('should throw calling the internal method to buy tokens', async () => {
      try {
        await this.crowdsale.buyTokens({ from: firstContributor, value: new web3.BigNumber(web3.toWei(1, 'ether')) })

        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('is not a function'), -1, error.message)
      }
    })

  })

  describe('after sale', async () => {

    it('should reject contributions', async () => {
      await increaseTimeTo(latestTime() + duration.weeks(2))

      try {
        await this.crowdsale.sendTransaction({ value: new web3.BigNumber(web3.toWei(1, 'ether')), from: firstContributor })

        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }
    })

    it('should throw claiming funds before the sale is finalized', async () => {
      await increaseTimeTo(latestTime() + duration.weeks(2))

      assert.isTrue(await this.crowdsale.hasEnded())
      try {
        await this.crowdsale.claimRefund({ from: firstContributor })

        assert.fail('should have thrown before')
      } catch (error) {
        assert.isAbove(error.message.search('revert'), -1, error.message)
      }

    })

    it('the owner could finalize the crowdsale and close the vault', async () => {
      await increaseTimeTo(latestTime() + duration.days(2))

      const vault = Vault.at(await this.crowdsale.vault())

      const prevBalance = web3.fromWei(web3.eth.getBalance(await vault.wallet()), 'ether').toNumber()

      const value = new web3.BigNumber(web3.toWei(4, 'ether'))
      await this.crowdsale.sendTransaction({ value, from: firstContributor })

      await increaseTimeTo(latestTime() + duration.weeks(2))

      await this.crowdsale.finalize()    

      assert.isTrue(await this.crowdsale.isFinalized())

      const vaultState = await vault.state()
      const newBalance = web3.fromWei(web3.eth.getBalance(await vault.wallet()), 'ether').toNumber()

      assert.equal(vaultState.toNumber(), 2, 'vault should be closed')
      assert.equal(parseInt(newBalance) - parseInt(prevBalance), web3.fromWei(value, 'ether').toNumber(), 'should be equal')
    })

    it('should refund payers if the goal is not reached', async () => {
      await increaseTimeTo(latestTime() + duration.days(2))
      
      const value = new web3.BigNumber(web3.toWei(1, 'ether'))
      await this.crowdsale.sendTransaction({ value, from: firstContributor })

      await increaseTimeTo(latestTime() + duration.weeks(2))
      await this.crowdsale.finalize()

      const before = web3.fromWei(web3.eth.getBalance(firstContributor), 'ether')
      
      await this.crowdsale.claimRefund({ from: firstContributor })
      const after = web3.fromWei(web3.eth.getBalance(firstContributor), 'ether')

      assert.equal(Math.round(after - before), web3.fromWei(value, 'ether').toNumber())
    })

    it('should enable the owner to claim all unsold tokens', async () => {
      await increaseTimeTo(latestTime() + duration.weeks(2))

      await this.crowdsale.finalize()
      
      const initialSupply = await this.token.balanceOf(this.crowdsale.address)
      const balanceBeforeClaim = await this.token.balanceOf(miner)

      await this.crowdsale.claimUnsold()

      const finalSupply = await this.token.balanceOf(this.crowdsale.address)
      const balanceAfterClaim = await this.token.balanceOf(miner)

      assert.equal(balanceAfterClaim.toNumber(), initialSupply.toNumber() + balanceBeforeClaim.toNumber())
      assert.equal(finalSupply.toNumber(), 0)
    })

    it('tokens should be unpaused only after finalization', async () => {
      await increaseTimeTo(latestTime() + duration.days(2))

      await this.crowdsale.sendTransaction({ value: new web3.BigNumber(web3.toWei(3, 'ether')), from: firstContributor })

      assert.isTrue(await this.token.paused(), 'token should be paused')

      await increaseTimeTo(latestTime() + duration.weeks(2))

      await this.crowdsale.finalize()   

      assert.isFalse(await this.token.paused(), 'token should be unpaused')
    })
  })

})