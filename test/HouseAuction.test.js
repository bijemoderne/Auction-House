const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HouseAuction", function () {
  let auction;
  let owner, user;

  before(async function () {
    [owner, user] = await ethers.getSigners();
    const HouseAuction = await ethers.getContractFactory("HouseAuction");
    auction = await HouseAuction.deploy();
    await auction.waitForDeployment();
  });

  it("Should add a new house", async function () {
    const startTime = (await ethers.provider.getBlock("latest")).timestamp + 100;
    const tx = await auction.connect(owner).addHouse(
      "Test House",
      "Test Description",
      "QmTestHash",
      "Test Location",
      ethers.parseEther("1"),
      startTime,
      startTime + 1000
    );
    
    await expect(tx)
      .to.emit(auction, "HouseAdded")
      .withArgs(1, "Test House");

    const house = await auction.houses(1);
    expect(house.title).to.equal("Test House");
  });

  it("Should prevent non-admin from adding houses", async function () {
    await expect(
      auction.connect(user).addHouse(
        "Unauthorized House",
        "Should fail",
        "QmHash",
        "Location",
        1,
        0,
        0
      )
    ).to.be.revertedWith("Only admin can perform this action");
  });

  // Add more test cases...
});