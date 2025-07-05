// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EthEscrow
 * @dev Ethereum escrow contract for atomic swaps
 * @notice This contract locks ETH that can only be claimed with a secret or refunded after timeout
 */
contract EthEscrow {
    address payable public deployer;
    address payable public recipient;
    bytes32 public hashlock;
    uint256 public timeout;
    uint256 public amount;
    bool public claimed;
    bool public refunded;
    
    event SecretRevealed(bytes32 secret);
    event Claimed(address indexed recipient, uint256 amount);
    event Refunded(address indexed deployer, uint256 amount);
    
    modifier onlyRecipient() {
        require(msg.sender == recipient, "Only recipient can call this");
        _;
    }
    
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can call this");
        _;
    }
    
    modifier notClaimed() {
        require(!claimed, "Already claimed");
        _;
    }
    
    modifier notRefunded() {
        require(!refunded, "Already refunded");
        _;
    }
    
    modifier afterTimeout() {
        require(block.timestamp >= timeout, "Timeout not yet reached");
        _;
    }
    
    constructor(
        address payable _recipient,
        bytes32 _hashlock,
        uint256 _timeout
    ) payable {
        require(msg.value > 0, "Must send ETH");
        require(_recipient != address(0), "Invalid recipient");
        require(_timeout > block.timestamp, "Timeout must be in the future");
        
        deployer = payable(msg.sender);
        recipient = _recipient;
        hashlock = _hashlock;
        timeout = _timeout;
        amount = msg.value;
    }
    
    /**
     * @dev Claim the locked ETH by revealing the secret
     * @param secret The secret that hashes to the hashlock
     */
    function claim(bytes32 secret) external onlyRecipient notClaimed notRefunded {
        require(sha256(abi.encodePacked(secret)) == hashlock, "Invalid secret");
        
        claimed = true;
        emit SecretRevealed(secret);
        emit Claimed(recipient, amount);
        
        recipient.transfer(amount);
    }
    
    /**
     * @dev Refund the locked ETH after timeout
     */
    function refund() external onlyDeployer afterTimeout notClaimed notRefunded {
        refunded = true;
        emit Refunded(deployer, amount);
        
        deployer.transfer(amount);
    }
    
    /**
     * @dev Get contract status
     */
    function getStatus() external view returns (
        bool _claimed,
        bool _refunded,
        uint256 _amount,
        uint256 _timeout,
        bytes32 _hashlock
    ) {
        return (claimed, refunded, amount, timeout, hashlock);
    }
}