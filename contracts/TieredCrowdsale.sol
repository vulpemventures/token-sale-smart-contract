pragma solidity ^0.4.21;

import "./Token.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/ReentrancyGuard.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/crowdsale/distribution/utils/RefundVault.sol";

/**
 * @title SampleCrowdsale
 * @dev SampleCrowdsale is a base contract for managing a token crowdsale.
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will assign them tokens based
 * on a token per ETH rate. Based on parameters passed at constructor, this contract
 * has 2 different behaviors. Funds collected are forwarded to a vault as they arrive. 
 */
contract TieredCrowdsale is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public cap;
    uint256 public goal;

    uint256[] public rates;
    uint256[] public tiersDuration;

    uint256 public constant WEI_TO_UNITS = 10**uint256(10);

    uint256 public endTime;
    uint256 public startTime;

    bool public isFinalized;
    uint256 public weiRaised;

    Token public token;
    RefundVault public vault;

    mapping(address => bool) public whitelist;
    mapping(address => uint256) public contribution;
    
    event WhitelistUpdate(address indexed purchaser, bool status);
    event TokenPurchase(address indexed beneficiary, uint256 value, uint256 amount);
    event TokenRefund(address indexed refundee, uint256 amount);

    event Finalized();
    

    function TieredCrowdsale(
        address _token, 
        address _wallet,
        uint256 _startTime,
        uint256 _endTime,
        uint256[] _rates,
        uint256[] _tiersDuration,
        uint256 _cap,
        uint256 _goal
    ) public {
        require(_startTime >= getBlockTimestamp());
        require(_rates.length == _tiersDuration.length);
        require(_endTime >= _startTime);
        require(_wallet != 0x0);
        require(_goal > 0);
        require(_cap > 0);

        vault = new RefundVault(_wallet);
        token = Token(_token);
        startTime = _startTime;
        endTime = _endTime;
        rates = _rates;
        tiersDuration = _tiersDuration;
        goal = _goal;
        cap = _cap;
    }

    // fallback function can be used to buy tokens
    function () external payable {
        buyTokens(msg.sender);
    }

    // low level function to buy tokens
    function buyTokens(address beneficiary) internal {
        require(beneficiary != 0x0);
        require(whitelist[beneficiary]);
        require(validPurchase());

        // derive amount in wei to buy 
        uint256 weiAmount = msg.value;

        uint256 remainingToFund = cap.sub(weiRaised);

        // check if there is enough funds 
        if (weiAmount > remainingToFund) {
            weiAmount = remainingToFund;
        }

        uint256 weiToReturn = msg.value.sub(weiAmount);

        // forward funds to the vault 
        forwardFunds(weiAmount);

        // refund if the contribution exceed the cap
        if (weiToReturn > 0) {
            beneficiary.transfer(weiToReturn);
            emit TokenRefund(beneficiary, weiToReturn);
        }

        // derive how many tokens
        uint256 tokens = getTokens(weiAmount);

        // update the state of the sale
        weiRaised = weiRaised.add(weiAmount);
        contribution[beneficiary] = contribution[beneficiary].add(weiAmount);
     
        emit TokenPurchase(beneficiary, weiAmount, tokens);

        // transfer tokens to investor
        token.transfer(beneficiary, tokens); 
    }

    // calculate amount of token (+ extra bonus) to be sent to purchaser
    function getTokens(uint256 amount) internal constant returns (uint256) {
        uint256 i = 0;

        while (i <= rates.length) {
            if (getBlockTimestamp() <= tiersDuration[i]) {
                return amount.mul(rates[i]).div(WEI_TO_UNITS);
            }

            ++i;
        }
    }

    // contributors can claim refund if the goal is not reached
    function claimRefund() public nonReentrant {
        require(isFinalized);
        require(!goalReached());

        vault.refund(msg.sender);
    }

    // in case of endTime before the reach of the cap, the owner can claim the unsold tokens
    function claimUnsold() public onlyOwner {
        require(endTime <= getBlockTimestamp());

        uint256 unsold = token.balanceOf(this);

        if (unsold > 0) {
            require(token.transfer(msg.sender, unsold));
        }
    }

    // add/remove to whitelist array of addresses based on boolean status
    function updateWhitelist(address[] addresses, bool status) public onlyOwner {
        for (uint256 i = 0; i < addresses.length; i++) {
            address contributorAddress = addresses[i];
            whitelist[contributorAddress] = status;
            emit WhitelistUpdate(contributorAddress, status);
        }
    }

    // only owner can manually finalize the sale
    function finalize() public onlyOwner {
        require(!isFinalized);
        require(hasEnded());

        // update the sate of the sale
        isFinalized = true;

        emit Finalized();

        if (goalReached()) {
            // close the vault
            vault.close();
            // unpause the token 
            token.unpause();
            // give ownership back to deployer
            token.transferOwnership(owner);
        } else {
            // else enable refunds
            vault.enableRefunds();
        }
    }

    // only owner can change the conversion rate
    function changeRate(uint256 index, uint256 _rate) public onlyOwner {
        require(rates[index] > 0);

        rates[index] = _rate;
    }

    // send ether to the fund collection wallet, the vault in this case
    function forwardFunds(uint256 weiAmount) internal {
        vault.deposit.value(weiAmount)(msg.sender);
    }

    // @return true if crowdsale event has ended or cap reached
    function hasEnded() public constant returns (bool) {
        bool outOfTime = getBlockTimestamp() > endTime;

        return outOfTime || capReached();
    }

    function capReached() public constant returns (bool) {
        return weiRaised >= cap;
    }

    function goalReached() public constant returns (bool) {
        return weiRaised >= goal;
    }

    function isWhitelisted(address contributor) public constant returns (bool) {
        return whitelist[contributor];
    }

    // @return true if the purchaser is allowed to buy tokens
    function validPurchase() internal constant returns (bool) {
        bool withinPeriod = getBlockTimestamp() >= startTime && getBlockTimestamp() <= endTime;
        bool nonZeroPurchase = msg.value != 0;
        bool capNotReached = weiRaised < cap;

        return withinPeriod && nonZeroPurchase && capNotReached;
    }

    function getBlockTimestamp() internal constant returns (uint256) {
        return block.timestamp;
    }
}