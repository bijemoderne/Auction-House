// const { expect } = require("chai");
// const { ethers } = require("hardhat");
// const { time } = require("@nomicfoundation/hardhat-network-helpers");

// describe("AuctionHouse", function () {
//   let AuctionHouse;
//   let auctionHouse;
//   let owner, seller, bidder1, bidder2, feeWallet;

//   before(async function () {
//     [owner, seller, bidder1, bidder2, feeWallet] = await ethers.getSigners();

//     AuctionHouse = await ethers.getContractFactory("AuctionHouse");
//     auctionHouse = await AuctionHouse.deploy(feeWallet.address);
//   });

//   describe("NFT Minting", function () {
//     it("Should auto-increment token IDs", async function () {
//       // Test auto-increment through auction creation
//       await auctionHouse.connect(seller).createAuctionWithNFT(
//         ethers.utils.parseEther("1"),
//         3600 // 1 hour
//       );
      
//       const auction = await auctionHouse.auctions(0);
//       expect(auction.tokenId).to.equal(0);

//       // Second NFT should have ID 1
//       await auctionHouse.connect(seller).createAuctionWithNFT(
//         ethers.utils.parseEther("1"),
//         3600
//       );
//       const auction2 = await auctionHouse.auctions(1);
//       expect(auction2.tokenId).to.equal(1);
//     });
//   });

//   describe("Auction Lifecycle", function () {
//     it("Should complete full auction flow", async function () {
//       // Create auction
//       await auctionHouse.connect(seller).createAuctionWithNFT(
//         ethers.utils.parseEther("1"),
//         3600
//       );

//       // Place bids
//       await auctionHouse.connect(bidder1).placeBid(2, {
//         value: ethers.utils.parseEther("1.5")
//       });
//       await auctionHouse.connect(bidder2).placeBid(2, {
//         value: ethers.utils.parseEther("2")
//       });

//       // Fast-forward time
//       await time.increase(3601);

//       // End auction
//       await auctionHouse.connect(seller).endAuction(2);

//       // Verify results
//       const auction = await auctionHouse.auctions(2);
//       expect(auction.ended).to.be.true;
//       expect(await auctionHouse.ownerOf(auction.tokenId)).to.equal(bidder2.address);
//     });
//   });

//   // Additional tests for edge cases...
// });
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});