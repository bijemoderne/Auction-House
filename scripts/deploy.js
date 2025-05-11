// const { ethers } = require("hardhat");

// async function main() {
//   const [deployer] = await ethers.getSigners();
//   console.log("Deploying contracts with the account:", deployer.address);

//   const AuctionHouse = await ethers.getContractFactory("AuctionHouse");
//   const auctionHouse = await AuctionHouse.deploy(deployer.address); // Using deployer as initial fee wallet

//   await auctionHouse.deployed();
//   console.log("AuctionHouse deployed to:", auctionHouse.address);

//   // Verify contract (manual step)
//   console.log("\nTo verify run:");
//   console.log(`npx hardhat verify --network sepolia ${auctionHouse.address} "${deployer.address}"`);
// }

// main()
//   .then(() => process.exit(0))
//   .catch((error) => {
//     console.error(error);
//     process.exit(1);
//   });

// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  // Get the contract factory
  const HouseAuction = await hre.ethers.getContractFactory("HouseAuction");

  // Deploy the contract
  const houseAuction = await HouseAuction.deploy();
  
  // Wait for deployment to complete
  await houseAuction.waitForDeployment();

  // Get the deployed contract address
  const contractAddress = await houseAuction.getAddress();
  
  console.log("HouseAuction deployed to:", contractAddress);
  console.log("Deployer address:", (await hre.ethers.provider.getSigner()).address);
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });