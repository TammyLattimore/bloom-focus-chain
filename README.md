# 🌸 Bloom Focus Chain

<div align="center">

**Privacy-First Focus Time Tracker on Blockchain**

*Track your productivity with encrypted on-chain storage using FHEVM*

[![License](https://img.shields.io/badge/License-BSD_3--Clause--Clear-blue.svg)](LICENSE)
[![Powered by Zama FHEVM](https://img.shields.io/badge/Powered%20by-Zama%20FHEVM-blueviolet)](https://docs.zama.ai/fhevm)
[![Built with Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-black)](https://nextjs.org/)

[Live Demo](https://bloom-focus-chain.vercel.app/) • [Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Video Demo](#-demo-video)

</div>

---

## 🎬 Live Demo & Video

### 🌐 Live Application

**Try it now**: [https://bloom-focus-chain.vercel.app/](https://bloom-focus-chain-nine.vercel.app/)

Experience the full application with:
- ✅ Encrypted session tracking on Sepolia testnet
- ✅ Real-time progress visualization
- ✅ Decentralized data storage
- ✅ Private analytics dashboard

### 📹 Demo Video

**Watch the complete walkthrough**: 

[![Watch Demo Video](https://img.shields.io/badge/▶️_Watch-Demo_Video-red?style=for-the-badge)](./project-demo.mp4)

📥 **[Download Demo Video (33MB)](./project-demo.mp4)**

The demo video showcases:
- 🔐 MetaMask wallet connection with Sepolia testnet
- ⏱️ Starting and managing focus sessions (configurable 1-240 min)
- 📊 Viewing encrypted statistics on Analytics dashboard
- 🔓 Decrypting private data with wallet signature
- 🎯 Setting encrypted weekly goals (e.g., 600 minutes/week)
- 💾 On-chain encrypted storage with FHEVM technology
- 🎨 Beautiful gradient UI with animated progress rings
- 🔄 Real-time session progress tracking
- 📈 Progress percentage toward weekly goals

---

## 📖 Overview

**Bloom Focus Chain** is a decentralized productivity tracking application that leverages **Fully Homomorphic Encryption (FHE)** to keep your focus session data private while stored on-chain. Built on Zama's FHEVM protocol, it ensures that only you can decrypt and view your productivity statistics, while still benefiting from blockchain's transparency and immutability.

### 🎯 Why Bloom Focus Chain?

- **🔐 Privacy-First**: Your session data is encrypted on-chain using FHE technology
- **🌐 Decentralized**: No centralized server can access your productivity data
- **🔗 Blockchain-Backed**: Immutable and verifiable session history
- **💡 User-Owned**: You control your data with your wallet keys
- **🎨 Modern UX**: Beautiful, responsive interface built with Next.js and Tailwind CSS

## ✨ Features

### 🎯 Core Features

#### Smart Contract Layer (FHEVM)
- **Encrypted Session Tracking**: Log focus sessions with encrypted duration data
- **Private Statistics**: Session count, total minutes, and weekly goals stored as encrypted values
- **Access Control**: Only the wallet owner can decrypt their own data
- **Manual Adjustments**: Add or modify minutes with encrypted operations
- **Reset Functionality**: Clear stats for new tracking periods

#### Frontend Application
- **🎨 Beautiful UI**: Modern, gradient-based design with smooth animations
- **⏱️ Timer System**: Configurable focus sessions (1-240 minutes)
- **📊 Analytics Dashboard**: View decrypted stats with progress tracking
- **🔄 Real-time Updates**: Live session progress and state management
- **🎯 Goal Setting**: Set and track encrypted weekly goals
- **💾 On-chain Storage**: All data saved directly to blockchain
- **🔐 Wallet Integration**: MetaMask support with EIP-6963 compatibility

#### Privacy Features
- **End-to-End Encryption**: All sensitive data encrypted before leaving your browser
- **Private Decryption**: Only you can decrypt your statistics
- **Zero-Knowledge**: No one (including us) can see your productivity data
- **Blockchain Transparency**: Verify contract logic while keeping data private

## 🏗️ Architecture

### Technology Stack

**Smart Contracts:**
- Solidity 0.8.27
- Zama FHEVM for encrypted operations
- Hardhat for development and testing
- OpenZeppelin contracts

**Frontend:**
- Next.js 15 (React 19)
- TypeScript for type safety
- Tailwind CSS for styling
- ethers.js v6 for blockchain interaction
- @zama-fhe/relayer-sdk for FHE operations

**Development Tools:**
- Hardhat for smart contract development
- Vitest for frontend testing
- ESLint & Prettier for code quality
- TypeChain for type-safe contract interactions

### Contract Architecture

```
FocusSession.sol (Main Contract)
├── Encrypted State
│   ├── _sessionCount (euint32)    // Total sessions per user
│   ├── _totalMinutes (euint32)    // Total focus minutes
│   └── _weeklyGoal (euint32)      // Weekly target in minutes
│
├── Core Functions
│   ├── logSession()               // Record encrypted session
│   ├── setWeeklyGoal()           // Set encrypted goal
│   ├── addMinutes()              // Manual adjustment
│   └── resetStats()              // Clear all data
│
└── View Functions
    ├── getSessionCount()         // Retrieve encrypted count
    ├── getTotalMinutes()         // Retrieve encrypted minutes
    └── getWeeklyGoal()          // Retrieve encrypted goal
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm/pnpm**: Package manager
- **MetaMask**: Browser extension for wallet
- **Sepolia ETH**: For testnet deployment (get from [Sepolia Faucet](https://sepoliafaucet.com/))

### Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/TammyLattimore/bloom-focus-chain.git
cd bloom-focus-chain
```

#### 2. Install Backend Dependencies

```bash
# Install Hardhat and contract dependencies
npm install
# or
pnpm install
```

#### 3. Set up Environment Variables

Create a `.env` file in the project root:

```bash
# Your wallet private key for Sepolia deployment
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Infura API key for network access (optional)
INFURA_API_KEY=your_infura_key_here

# Sepolia RPC URL (optional, defaults to Infura)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
```

Or use Hardhat configuration variables:

```bash
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set ETHERSCAN_API_KEY  # For contract verification
```

#### 4. Compile Smart Contracts

```bash
npm run compile
```

#### 5. Run Tests

```bash
# Run local tests with FHEVM mock
npm run test

# Run tests on Sepolia (requires deployed contract)
npm run test:sepolia
```

#### 6. Deploy Contracts

**Local Network (for development):**

```bash
# Terminal 1: Start local Hardhat node
npm run node

# Terminal 2: Deploy contracts
npx hardhat deploy --network localhost
```

**Sepolia Testnet:**

```bash
# Deploy to Sepolia
npx hardhat deploy --network sepolia

# Verify on Etherscan
npx hardhat verify --network sepolia <FOCUS_SESSION_ADDRESS>
```

#### 7. Install and Run Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev

# Open browser at http://localhost:3000
```

## 📱 Usage Guide

### Starting a Focus Session

1. **Connect Wallet**: Click "Connect Wallet" and approve MetaMask connection
2. **Configure Duration**: Click on session duration to change (default: 25 minutes)
3. **Start Session**: Click "Start Focus Session"
4. **Track Progress**: Watch the timer and progress ring
5. **Save Session**: When done, click "Save Session" to encrypt and store on-chain

### Viewing Your Statistics

1. **Navigate to Analytics**: Click "Analytics" in the header
2. **Refresh Data**: Click "Refresh" to fetch latest encrypted handles
3. **Decrypt Stats**: Click "Decrypt Stats" and sign the message in MetaMask
4. **View Insights**: See your session count, total minutes, and progress toward goals

### Setting Weekly Goals

1. Go to Analytics dashboard
2. Click "Set Goal"
3. Enter target minutes (e.g., 600 for 10 hours)
4. Click "Save" and approve the transaction
5. Your goal will be encrypted and stored on-chain

### Resetting Statistics

1. In Analytics dashboard, scroll to "Contract Status"
2. Click "Reset On-chain Stats"
3. Approve the transaction to clear all data

## 📁 Project Structure

```
bloom-focus-chain/
├── contracts/                    # Smart Contracts
│   ├── FocusSession.sol         # Main focus tracking contract
│   └── FHECounter.sol           # Example FHE counter
│
├── deploy/                      # Deployment Scripts
│   └── deploy.ts                # Hardhat-deploy script
│
├── test/                        # Contract Tests
│   ├── FocusSession.ts          # FocusSession tests (local)
│   ├── FocusSessionSepolia.ts   # Sepolia integration tests
│   ├── FHECounter.ts            # Counter tests (local)
│   └── FHECounterSepolia.ts     # Counter Sepolia tests
│
├── tasks/                       # Hardhat Tasks
│   ├── accounts.ts              # List accounts
│   └── FHECounter.ts            # Counter interaction tasks
│
├── frontend/                    # Next.js Frontend Application
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx            # Main application page
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   └── providers.tsx       # Context providers
│   │
│   ├── components/              # React Components
│   │   ├── ConnectWalletButton.tsx
│   │   ├── SessionControls.tsx  # Timer and controls
│   │   ├── TimerRing.tsx       # Animated progress ring
│   │   ├── ProgressRingFooter.tsx
│   │   ├── Logo.tsx
│   │   └── ui/                 # shadcn/ui components
│   │
│   ├── hooks/                   # Custom React Hooks
│   │   ├── useFocusSession.tsx  # Main contract interaction hook
│   │   ├── useFHECounter.tsx    # Counter example hook
│   │   ├── useInMemoryStorage.tsx
│   │   └── metamask/           # MetaMask wallet hooks
│   │       ├── useMetaMaskEthersSigner.tsx
│   │       ├── useMetaMaskProvider.tsx
│   │       └── useEip6963.tsx
│   │
│   ├── fhevm/                   # FHEVM Integration
│   │   ├── useFhevm.tsx        # FHEVM instance hook
│   │   ├── fhevmTypes.ts       # TypeScript types
│   │   ├── FhevmDecryptionSignature.ts
│   │   ├── GenericStringStorage.ts
│   │   └── internal/           # Internal FHEVM utilities
│   │
│   ├── abi/                     # Contract ABIs
│   │   ├── FocusSessionABI.ts
│   │   ├── FocusSessionAddresses.ts
│   │   ├── FHECounterABI.ts
│   │   └── FHECounterAddresses.ts
│   │
│   ├── scripts/                 # Frontend Scripts
│   │   ├── genabi.mjs          # Generate ABIs
│   │   ├── deploy-hardhat-node.sh
│   │   └── is-hardhat-node-running.mjs
│   │
│   └── public/                  # Static Assets
│       ├── favicon.svg
│       ├── logo.svg
│       └── zama-logo.svg
│
├── hardhat.config.ts            # Hardhat Configuration
├── tsconfig.json                # TypeScript Config
├── package.json                 # Backend Dependencies
├── .gitignore                   # Git Ignore Rules
├── LICENSE                      # BSD-3-Clause-Clear License
└── README.md                    # This file
```

## 📜 Available Scripts

### Backend Scripts

| Script                | Description                                    |
| --------------------- | ---------------------------------------------- |
| `npm run compile`     | Compile all smart contracts                    |
| `npm run test`        | Run contract tests on local mock network       |
| `npm run test:sepolia`| Run tests on Sepolia testnet                   |
| `npm run coverage`    | Generate test coverage report                  |
| `npm run lint`        | Run ESLint and Solhint checks                  |
| `npm run lint:sol`    | Lint Solidity contracts                        |
| `npm run lint:ts`     | Lint TypeScript files                          |
| `npm run prettier:check` | Check code formatting                       |
| `npm run prettier:write` | Format code with Prettier                   |
| `npm run clean`       | Clean build artifacts and cache                |
| `npm run typechain`   | Generate TypeScript types from contracts       |
| `npm run node`        | Start local Hardhat node                       |

### Frontend Scripts (in `frontend/` directory)

| Script              | Description                                     |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Start Next.js development server                |
| `npm run build`     | Build production frontend                       |
| `npm run start`     | Start production server                         |
| `npm run lint`      | Lint frontend code                              |
| `npm run test`      | Run Vitest tests                                |

## 🔧 Configuration

### Network Configuration

The project supports multiple networks configured in `hardhat.config.ts`:

- **Hardhat**: Local development network (chainId: 31337)
- **Anvil**: Alternative local network
- **Sepolia**: Ethereum testnet (chainId: 11155111)

### Contract Addresses

Contract addresses are automatically managed in:
- `frontend/abi/FocusSessionAddresses.ts`
- `frontend/abi/FHECounterAddresses.ts`

Update these after deploying to new networks.

### Environment Variables

**Backend (.env):**
```env
SEPOLIA_PRIVATE_KEY=        # Your wallet private key
INFURA_API_KEY=             # Infura project ID
SEPOLIA_RPC_URL=            # Custom RPC URL (optional)
```

**Frontend (frontend/.env.local):**
```env
NEXT_PUBLIC_FOCUS_SESSION_ADDRESS_SEPOLIA=   # Sepolia contract address
NEXT_PUBLIC_FOCUS_SESSION_ADDRESS_HARDHAT=   # Local contract address
```

## 🧪 Testing

### Unit Tests

```bash
# Run all tests with FHEVM mock
npm run test

# Run specific test file
npx hardhat test test/FocusSession.ts

# Run with gas reporting
REPORT_GAS=true npm run test
```

### Integration Tests (Sepolia)

```bash
# Requires deployed contracts on Sepolia
npm run test:sepolia
```

### Test Coverage

```bash
npm run coverage
```

Coverage reports are generated in `coverage/` directory.

## 🔐 Security Considerations

### Private Key Management
- ⚠️ **Never commit private keys** to version control
- Use environment variables or Hardhat configuration variables
- Consider using hardware wallets for mainnet deployments

### Smart Contract Security
- All user data is encrypted using FHEVM
- Access control enforced at contract level
- Only wallet owners can decrypt their own data
- Contracts audited using standard security practices

### Frontend Security
- Wallet signature required for decryption
- No sensitive data stored in browser
- All encryption happens client-side
- HTTPS recommended for production deployment

## 🚢 Deployment

### Deploy to Sepolia

1. **Ensure you have Sepolia ETH** in your wallet

2. **Configure environment:**
```bash
# Set your private key
export SEPOLIA_PRIVATE_KEY=your_key_here
```

3. **Deploy contracts:**
```bash
npx hardhat deploy --network sepolia
```

4. **Verify on Etherscan:**
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

5. **Update frontend ABI:**
```bash
cd frontend
npm run genabi
```

### Deploy Frontend

**Vercel (Recommended):**
```bash
cd frontend
vercel
```

**Self-hosted:**
```bash
cd frontend
npm run build
npm run start
```

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Commit Convention

We use Conventional Commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

## 🐛 Troubleshooting

### MetaMask Issues

**Problem**: Nonce mismatch error
**Solution**: Clear activity tab in MetaMask Settings > Advanced

**Problem**: Stale view function results
**Solution**: Restart browser completely

### Contract Interaction Issues

**Problem**: "Contract not deployed" error
**Solution**: Ensure contract is deployed to current network

**Problem**: Decryption fails
**Solution**: Check wallet connection and try signing message again

### Build Issues

**Problem**: TypeScript errors
**Solution**: Run `npm run typechain` to regenerate types

**Problem**: Module not found
**Solution**: Delete `node_modules` and run `npm install` again

## 📚 Documentation

### FHEVM Resources
- [FHEVM Official Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [@zama-fhe/relayer-sdk](https://docs.zama.ai/protocol/relayer-sdk-guides/)

### Framework Documentation
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [ethers.js v6](https://docs.ethers.org/v6/)

### Additional Resources
- [Solidity Documentation](https://docs.soliditylang.org/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [EIP-6963: Multi Injected Provider Discovery](https://eips.ethereum.org/EIPS/eip-6963)

## 💡 How It Works

### Encryption Flow

1. **User Input**: You enter session duration in the frontend
2. **Client-Side Encryption**: Duration is encrypted using FHEVM SDK
3. **Blockchain Transaction**: Encrypted data sent to smart contract
4. **On-Chain Storage**: Contract stores encrypted value (euint32)
5. **Decryption**: Only you can decrypt using your wallet signature

### Key Components

**FocusSession Contract:**
- Uses Zama's FHEVM library for encrypted operations
- Stores `euint32` encrypted integers
- Implements FHE arithmetic (add, subtract)
- Enforces access control via `msg.sender`

**Frontend Integration:**
- Creates encrypted inputs via FHEVM instance
- Manages wallet connection and signatures
- Handles decryption using relayer SDK
- Provides user-friendly interface

## 🎨 UI Features

- **Gradient Design**: Modern color scheme with smooth transitions
- **Animated Progress Ring**: Visual feedback for active sessions
- **Responsive Layout**: Works on desktop and mobile devices
- **Dark Theme**: Comfortable for extended use
- **Toast Notifications**: Clear user feedback
- **Loading States**: Visual indicators for blockchain operations

## 🔄 Roadmap

- [ ] Multi-chain support (Polygon, Arbitrum)
- [ ] NFT achievements for milestones
- [ ] Social features (private leaderboards)
- [ ] Calendar view for session history
- [ ] Export encrypted data
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Integration with productivity tools

## 📊 Performance

- **Gas Optimization**: Efficient FHE operations
- **Fast Decryption**: Optimized relayer SDK usage
- **Minimal Re-renders**: React performance optimizations
- **Type Safety**: Full TypeScript coverage
- **Test Coverage**: Comprehensive test suite

## 🌟 Acknowledgments

- **Zama**: For the incredible FHEVM technology
- **Hardhat**: For the excellent development framework
- **Next.js Team**: For the amazing React framework
- **shadcn/ui**: For beautiful UI components
- **OpenZeppelin**: For secure contract patterns

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ⚠️ Patent rights not granted explicitly
- ⚠️ Warranty and liability limitations apply

## 🆘 Support & Community

### Get Help

- **📖 Documentation**: Check this README and linked docs first
- **🐛 Issues**: [GitHub Issues](https://github.com/TammyLattimore/bloom-focus-chain/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/TammyLattimore/bloom-focus-chain/discussions)

### FHEVM Community

- **Discord**: [Zama Community Discord](https://discord.gg/zama)
- **Forum**: [Zama Community Forum](https://community.zama.ai/)
- **Twitter**: [@zama_fhe](https://twitter.com/zama_fhe)

### Contact

For questions about this specific project:
- Open an issue on GitHub
- Contact: xjsdddqa9718264@outlook.com

---

<div align="center">

**Built with 🌸 using Zama FHEVM**

*Keeping your productivity data private, one encrypted session at a time*

[⭐ Star this repo](https://github.com/TammyLattimore/bloom-focus-chain) • [🐛 Report Bug](https://github.com/TammyLattimore/bloom-focus-chain/issues) • [✨ Request Feature](https://github.com/TammyLattimore/bloom-focus-chain/issues)

</div>
