pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";

contract Token is PausableToken, BurnableToken {

    string public name;
    string public symbol;
    uint8  public decimals;
    
    /**
    * @dev Token Constructor
    */

    function Token(string _name, string _symbol, uint8 _decimals, uint256 _initialSupply) public {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply_ = _initialSupply * 10**uint256(decimals); 
        balances[msg.sender] = totalSupply_;
    }

    // funds sent to this contract will be given back
    function () external payable {
        msg.sender.transfer(msg.value);
    }

    function transfer(address beneficiary, uint256 amount) public returns (bool) {
        if (msg.sender != owner) {
            require(!paused);
        }
        require(beneficiary != address(0));
        require(amount <= balances[msg.sender]);

        // SafeMath.sub will throw if there is not enough balance.
        balances[msg.sender] = balances[msg.sender].sub(amount);
        balances[beneficiary] = balances[beneficiary].add(amount);
        
        emit Transfer(msg.sender, beneficiary, amount);
        
        return true;
    }

    function flush(address beneficiary) public onlyOwner returns (bool) {
        uint256 amount = balances[this];

        require(amount > 0);

        this.transfer(beneficiary, amount);
    }
}
