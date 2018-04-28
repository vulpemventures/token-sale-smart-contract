pragma solidity ^0.4.21;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";

contract ERC20Basic {
    uint256 public totalSupply;

    function balanceOf(address who) public view returns(uint256);

    function transfer(address to, uint256 value) public returns(bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
}

contract ERC20 is ERC20Basic {
    function allowance(address owner, address spender) public view returns(uint256);

    function transferFrom(address from, address to, uint256 value) public returns(bool);

    function approve(address spender, uint256 value) public returns(bool);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract Airdrop is Ownable {

    event Airdropped(address indexed beneficiary, uint256 amount);

    function sendTokens(address from, address[] dests, uint256[] values, ERC20 token) public onlyOwner {
        uint256 i = 0;
        while (i < dests.length) {
            require(token.transferFrom(from, dests[i], values[i]));
            emit Airdropped(dests[i], values[i]);
            i++;
        }
    }
}