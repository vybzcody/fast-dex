// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Vault is ReentrancyGuard {
    address public immutable usdcToken;
    uint256 public depositNonce = 0;
    mapping(uint256 => address) public userDeposits;

    constructor(address _usdcToken) {
        usdcToken = _usdcToken;
    }

    function depositUSDC(uint256 amount, address user) external nonReentrant {
        require(user != address(0), "Invalid user address");
        userDeposits[depositNonce] = user;
        // Assuming USDC is a standard ERC20 token
        IERC20(usdcToken).transferFrom(msg.sender, address(this), amount);
        depositNonce++;
    }

    function depositETH(address user) external payable nonReentrant {
        require(user != address(0), "Invalid user address");
        userDeposits[depositNonce] = user;
        depositNonce++;
    }

    function withdrawUSDC(uint256 nonce, uint256 amount, uint256 deadline) external nonReentrant {
        require(block.timestamp <= deadline, "Deadline expired");
        require(userDeposits[nonce] == msg.sender, "Not authorized");
        IERC20(usdcToken).transfer(msg.sender, amount);
    }

    function withdrawETH(uint256 nonce, uint256 amount, uint256 deadline) external nonReentrant {
        require(block.timestamp <= deadline, "Deadline expired");
        require(userDeposits[nonce] == msg.sender, "Not authorized");
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}