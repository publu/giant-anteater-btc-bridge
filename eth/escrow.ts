import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';

const contractABI = [
  "constructor(address payable _recipient, bytes32 _hashlock, uint256 _timeout) payable",
  "function claim(bytes32 secret) external",
  "function refund() external",
  "function getStatus() external view returns (bool _claimed, bool _refunded, uint256 _amount, uint256 _timeout, bytes32 _hashlock)",
  "event SecretRevealed(bytes32 secret)",
  "event Claimed(address indexed recipient, uint256 amount)",
  "event Refunded(address indexed deployer, uint256 amount)"
];

export class EthEscrowManager {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contractBytecode: string;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Load contract bytecode
    try {
      const artifact = JSON.parse(
        readFileSync(join(process.cwd(), 'artifacts/contracts/EthEscrow.sol/EthEscrow.json'), 'utf8')
      );
      this.contractBytecode = artifact.bytecode;
    } catch (error) {
      throw new Error('Contract artifact not found. Please compile contracts first.');
    }
  }

  /**
   * Deploy a new escrow contract
   */
  async deployEscrow(
    recipient: string,
    hashlock: string,
    timeout: number,
    ethAmount: string
  ): Promise<{ contract: ethers.Contract; address: string; txHash: string }> {
    const factory = new ethers.ContractFactory(contractABI, this.contractBytecode, this.signer);
    
    const contract = await factory.deploy(
      recipient,
      hashlock,
      timeout,
      { value: ethers.parseEther(ethAmount) }
    );
    
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();
    
    if (!deploymentTx) {
      throw new Error('Deployment transaction not found');
    }
    
    return {
      contract,
      address,
      txHash: deploymentTx.hash
    };
  }

  /**
   * Get contract instance
   */
  getContract(address: string): ethers.Contract {
    return new ethers.Contract(address, contractABI, this.signer);
  }

  /**
   * Claim ETH from escrow with secret
   */
  async claim(contractAddress: string, secret: string): Promise<{ txHash: string; secretRevealed: boolean }> {
    const contract = this.getContract(contractAddress);
    
    // Convert secret to bytes32
    const secretBytes = ethers.zeroPadValue(ethers.toUtf8Bytes(secret), 32);
    
    const tx = await contract.claim(secretBytes);
    const receipt = await tx.wait();
    
    // Check if SecretRevealed event was emitted
    const secretRevealedEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === 'SecretRevealed';
      } catch {
        return false;
      }
    });
    
    return {
      txHash: tx.hash,
      secretRevealed: !!secretRevealedEvent
    };
  }

  /**
   * Refund ETH from escrow after timeout
   */
  async refund(contractAddress: string): Promise<{ txHash: string }> {
    const contract = this.getContract(contractAddress);
    
    const tx = await contract.refund();
    await tx.wait();
    
    return { txHash: tx.hash };
  }

  /**
   * Get contract status
   */
  async getStatus(contractAddress: string) {
    const contract = this.getContract(contractAddress);
    const status = await contract.getStatus();
    
    return {
      claimed: status._claimed,
      refunded: status._refunded,
      amount: ethers.formatEther(status._amount),
      timeout: Number(status._timeout),
      hashlock: status._hashlock
    };
  }

  /**
   * Listen for SecretRevealed events
   */
  async listenForSecretRevealed(
    contractAddress: string,
    callback: (secret: string) => void
  ): Promise<void> {
    const contract = this.getContract(contractAddress);
    
    contract.on('SecretRevealed', (secret: string) => {
      // Convert bytes32 back to string
      const secretString = ethers.toUtf8String(secret).replace(/\0/g, '');
      callback(secretString);
    });
  }

  /**
   * Generate a random secret
   */
  static generateSecret(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * Generate hashlock from secret
   */
  static generateHashlock(secret: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(secret));
  }

  /**
   * Get current block timestamp
   */
  async getCurrentTimestamp(): Promise<number> {
    const block = await this.provider.getBlock('latest');
    return block ? block.timestamp : Math.floor(Date.now() / 1000);
  }
}

export default EthEscrowManager;