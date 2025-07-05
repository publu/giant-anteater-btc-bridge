# ETH ↔ BTC Atomic Swap Platform

A complete atomic swap system for trustless exchanges between Bitcoin and Ethereum using Hash Time Lock Contracts (HTLCs).

## Features

- **Trustless Swaps**: No intermediaries required
- **Smart Contract Security**: Ethereum escrow contracts with automatic refunds
- **Bitcoin HTLC Support**: Proper Bitcoin script implementation
- **Beautiful UI**: Modern React interface with real-time updates
- **REST API**: Complete backend for swap management
- **SQLite Database**: Local data persistence
- **Testnet Support**: Safe testing environment

## Architecture

### Smart Contracts (Solidity)
- **EthEscrow**: Ethereum escrow contract with hashlock and timeout
- **Claim/Refund**: Secure fund release mechanisms
- **Event Logging**: Complete audit trail

### Bitcoin Integration
- **HTLC Scripts**: Native Bitcoin script implementation
- **P2WSH**: SegWit-compatible transactions
- **Testnet**: Bitcoin testnet support

### Backend API
- **Express Server**: RESTful API for swap management
- **SQLite Database**: Local data storage
- **Ethers.js**: Ethereum blockchain integration
- **bitcoinjs-lib**: Bitcoin transaction handling

### Frontend
- **React + TypeScript**: Modern web interface
- **Tailwind CSS**: Beautiful, responsive design
- **Real-time Updates**: Live swap status tracking
- **Wallet Integration**: Connect to MetaMask and Bitcoin wallets

## Getting Started

### Prerequisites
- Node.js 18+
- Git
- MetaMask (for Ethereum)
- Bitcoin Core or testnet wallet

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eth-btc-atomic-swap
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Initialize the database:
```bash
npm run setup-db
```

5. Compile smart contracts:
```bash
npm run compile-contracts
```

6. Start the development servers:
```bash
npm run dev-all
```

This will start both the API server (port 3001) and the React frontend (port 5173).

## Usage

### Creating a Swap

1. Navigate to the Create Swap page
2. Choose swap direction (BTC→ETH or ETH→BTC)
3. Enter amounts and addresses
4. Set expiration time
5. Click "Create Swap"

### Completing a Swap

#### For BTC→ETH swaps:
1. Alice creates the swap
2. Bob funds the Bitcoin HTLC
3. Alice funds the Ethereum escrow
4. Bob reveals the secret on Ethereum to claim ETH
5. Alice uses the revealed secret to claim BTC

#### For ETH→BTC swaps:
1. Alice creates the swap and funds Ethereum escrow
2. Bob funds the Bitcoin HTLC
3. Alice reveals the secret on Ethereum to claim the locked funds
4. Bob uses the revealed secret to claim BTC

### API Endpoints

- `POST /swap/create` - Create new swap
- `GET /swap/:id` - Get swap details
- `GET /swaps` - List all swaps
- `POST /swap/:id/fund-btc` - Mark Bitcoin as funded
- `POST /swap/:id/fund-eth` - Deploy Ethereum escrow
- `POST /swap/:id/submit-secret` - Submit secret for claiming
- `POST /swap/:id/claim-eth` - Claim ETH from escrow
- `POST /swap/:id/refund-eth` - Refund ETH after timeout

## Security Considerations

### Production Deployment
- Use hardware wallets for key management
- Implement proper key rotation
- Set up monitoring and alerts
- Use mainnet with proper gas estimation
- Implement rate limiting
- Add input validation and sanitization

### Testing
- Always test on testnets first
- Verify all timeout mechanisms
- Test edge cases (network delays, high fees)
- Validate secret generation and verification

## Technical Details

### Hash Time Lock Contracts (HTLCs)
HTLCs use cryptographic hash functions and time locks to ensure atomic swaps:
- **Hash Lock**: Funds can only be claimed with the correct secret
- **Time Lock**: Funds are automatically refunded after expiration
- **Atomic**: Either both parties get their funds or both get refunded

### Bitcoin Script
```
OP_IF
  OP_SHA256 <hashlock> OP_EQUALVERIFY <recipientPubkey> OP_CHECKSIG
OP_ELSE
  <locktime> OP_CHECKLOCKTIMEVERIFY OP_DROP <refundPubkey> OP_CHECKSIG
OP_ENDIF
```

### Ethereum Contract
```solidity
function claim(bytes32 secret) external onlyRecipient {
    require(sha256(abi.encodePacked(secret)) == hashlock, "Invalid secret");
    claimed = true;
    emit SecretRevealed(secret);
    recipient.transfer(amount);
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions or issues, please create an issue on GitHub or contact the development team.