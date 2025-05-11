
# 🗳️ Auction-House DApp

1. **Clone the repo**

```bash
git https://github.com/bijemoderne/Auction-House/edit/main/README.md
cd Auction 
MY 

✅ Strengths
Well-Structured State Management:

Clearly separates concerns using useState hooks for UI, user, contract data, and feedback.

Good Error Handling:

try-catch blocks are used throughout, with helpful error messages tailored for user understanding.

Comprehensive Feature Set:

Covers a full range of auction functionality: connect wallet, CRUD for houses, bidding, auction state changes, admin login, etc.

UI Feedback & Messaging:

Uses a centralized showMessage() function for alerts—good for consistent UX.

Code Reusability:

The handleContractTransaction abstraction reduces redundancy for blockchain transactions.

Security Enhancements:

Confirms actions (e.g., deletion) and validates inputs (e.g., image size, type, empty fields).

⚠️ Issues & Recommendations
1. Admin Login is Client-Side Only
Issue: Admin access is based solely on hardcoded username/password, with no blockchain verification.

Fix: Rely entirely on the smart contract’s admins(address) mapping. Remove the client-side login system or use it only as a fallback for local testing.

2. Security Concern with localStorage
Issue: Admin login state stored in localStorage can be manipulated by users.

Fix: Store no sensitive information in localStorage. Use on-chain validation for role checks.

3. Repeated Code for House Form (Add/Update)
Suggestion: Create a reusable HouseForm component to reduce repetition between handleAddHouse and handleUpdateHouse.

4. Image Handling Optimization
Observation: Base64-encoded images are stored on-chain (imageHash) which can bloat the blockchain.

Fix: Upload images to IPFS or another decentralized storage, then save the IPFS hash in the smart contract.

5. Missing useEffect for Wallet Events
You have handlers for account and chain changes, but they are not registered.

Fix:

useEffect(() => {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }
}, []);

6. Contract Initialization Logic Could Be DRY-er
initEthereum and checkNetwork could be factored into a separate hook or utility.

📌 Final Suggestions
Consider using a context provider (e.g., WalletContext) to handle Ethereum connection state across components.

Enhance UX with loading spinners or skeleton screens during isLoading.

Add sorting/filtering for house listings (e.g., by active status or price).

Implement unit tests for the transaction and utility logic (can use Jest with mocks).

Would you like help refactoring this into modular components (e.g., HouseCard, HouseForm, etc.) or setting up IPFS image uploads?
==================================================================================================================================================

# Web 3.0 Lab: House Auction DApp

This project introduces students to Web 3.0 development by building a decentralized house auction platform. It includes:

- **Part I:** Smart Contract development with Hardhat.
- **Part II:** Frontend development with React & Vite, and integration with the blockchain backend.

---

## 🚀 Part I: Smart Contract Development with Hardhat

### Step 1: Install Node.js and npm
- Download from: [https://nodejs.org](https://nodejs.org)
- Verify installation:
 
  node -v
  npm -v
-----------------------------------------------------------
Step 2: Initialize the Hardhat Project

mkdir house-auction-dapp
cd house-auction-dapp
npm init -y
npm install --save-dev hardhat
npx hardhat init
# Choose "Create a JavaScript project"
Replace the default contract with your own HouseAuction.sol file.

Optional: Install OpenZeppelin contracts


npm install @openzeppelin/contracts
----------------------------------------------------------------------
Step 3: Compile the Contract

npm install --save-dev @nomicfoundation/hardhat-toolbox
npx hardhat compile
---------------------------------------------------------------
Step 4: Test the Contract
Create a file test/HouseAuction.js

Write and run unit tests:


npx hardhat test
---------------------------------------------------------------------------
Step 5: Deploy the Contract
Create a deployment script: scripts/deploy.js

Run the deployment:


npx hardhat run scripts/deploy.js --network localhost
🎨 Part II: Frontend with React & Vite
-----------------------------------------------------------------------------
Step 6: Create Frontend Project

npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install ethers
Step 7: Run the Frontend App

npm run dev
-----------------------------------------------------------------------------------
Step 8: Connect Frontend to Smart Contract
Use ethers.js to connect to the deployed contract.

Import ABI and contract address.

Connect MetaMask (or other Web3 wallet) to interact with the contract.
----------------------------------------------------------------------------------------------

Step 9: Interact with the DApp
The DApp provides a role-based experience:

Admin:

Creates house listings with minimum bid and auction duration.

Starts and ends auctions.

Users:

Connect MetaMask to view available auctions.

Place bids during active auctions.

See highest bid, bidder, and auction countdown.

📁 Project Structure Overview
=============================

house-auction-dapp/
==================

├── contracts/
│   └── HouseAuction.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── HouseAuction.js
├── hardhat.config.js
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── utils/
│   └── hardhat.config.js
✅ Prerequisites
Node.js and npm

Hardhat

MetaMask wallet

Code editor (VS Code recommended)

🧪 Learning Outcomes
By completing this project, you will:

Understand the development and deployment of smart contracts.

Build and test decentralized auction logic.

Create a React-based frontend that communicates with a blockchain.

Handle Web3 interactions via ethers.js.

💡 Tips
Use the Hardhat local network for fast testing.

Ensure MetaMask is connected to the same local or testnet network.

Use browser console and console.log in contracts/scripts for debugging.

Consider edge cases like bidding after the auction ends or unauthorized access.

📜 License
This project is for educational purposes only. You're encouraged to experiment, customize, and extend it further!



Thank You!!!!


