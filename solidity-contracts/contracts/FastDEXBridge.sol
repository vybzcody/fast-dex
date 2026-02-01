// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract FastDEXBridge is ReentrancyGuard, Ownable {
    IERC20 public immutable usdc;
    
    event Deposit(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 indexed nonce
    );
    
    event Withdrawal(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 indexed nonce
    );
    
    mapping(uint256 => bool) public processedWithdrawals;
    uint256 public depositNonce;
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdc.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit Deposit(msg.sender, address(usdc), amount, depositNonce++);
    }
    
    function depositETH() external payable nonReentrant {
        require(msg.value > 0, "Amount must be > 0");
        
        emit Deposit(msg.sender, address(0), msg.value, depositNonce++);
    }
    
    function withdrawUSDC(
        address user,
        uint256 amount,
        uint256 nonce
    ) external onlyOwner nonReentrant {
        require(!processedWithdrawals[nonce], "Already processed");
        require(usdc.balanceOf(address(this)) >= amount, "Insufficient balance");
        
        processedWithdrawals[nonce] = true;
        require(usdc.transfer(user, amount), "Transfer failed");
        
        emit Withdrawal(user, address(usdc), amount, nonce);
    }
    
    function withdrawETH(
        address payable user,
        uint256 amount,
        uint256 nonce
    ) external onlyOwner nonReentrant {
        require(!processedWithdrawals[nonce], "Already processed");
        require(address(this).balance >= amount, "Insufficient balance");
        
        processedWithdrawals[nonce] = true;
        user.transfer(amount);
        
        emit Withdrawal(user, address(0), amount, nonce);
    }
    
    function emergencyWithdraw() external onlyOwner {
        uint256 usdcBalance = usdc.balanceOf(address(this));
        if (usdcBalance > 0) {
            usdc.transfer(owner(), usdcBalance);
        }
        
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            payable(owner()).transfer(ethBalance);
        }
    }
}
