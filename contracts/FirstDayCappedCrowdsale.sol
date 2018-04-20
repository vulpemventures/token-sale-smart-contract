pragma solidity ^0.4.21;

import "./Token.sol";
import "./TieredCrowdsale.sol";


contract FirstDayCappedCrowdsale is TieredCrowdsale {

    uint256 public firstDayCap;
    uint256 public firstDay;

    function FirstDayCappedCrowdsale(
        address _token, 
        address _wallet,
        uint256 _startTime,
        uint256 _endTime,
        uint256[] _rates,
        uint256[] _tiersDuration,
        uint256 _cap,
        uint256 _goal,
        uint256 _firstDayCap
    ) TieredCrowdsale(
        _token,
        _wallet,
        _startTime,
        _endTime,
        _rates,
        _tiersDuration,
        _cap,
        _goal
    ) public {
        require(_firstDayCap > 0);

        firstDayCap = _firstDayCap;
        firstDay = startTime + (1 * 1 days);
    }

    function buyTokens(address beneficiary) internal {
        // check if contribution respects the 24hrs limit
        if (getBlockTimestamp() <= firstDay) {
            require((contribution[beneficiary].add(msg.value)) <= firstDayCap);
        }

        super.buyTokens(beneficiary);
    }

}