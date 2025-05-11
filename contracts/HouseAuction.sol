// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract HouseAuction is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _houseIdCounter;

    struct House {
        uint256 id;
        string title;
        string description;
        string imageHash;
        uint256 startPrice;
        bool isActive;
        bool isStarted;
        bool isAuctionEnded;
        address highestBidder;
        uint256 highestBid;
    }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    mapping(uint256 => House) public houses;
    mapping(uint256 => Bid[]) public bids;
    mapping(address => bool) public admins;

    event HouseAdded(uint256 indexed houseId, address indexed seller);
    event HouseUpdated(uint256 indexed houseId, address indexed seller);
    event HouseDeleted(uint256 indexed houseId);
    event AuctionStarted(uint256 indexed houseId, address indexed seller);
    event AuctionEnded(uint256 indexed houseId, address indexed winner);
    event BidPlaced(uint256 indexed houseId, address indexed bidder, uint256 amount);

    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Not admin");
        _;
    }

    constructor() {
        admins[msg.sender] = true;
    }

    function addAdmin(address _admin) external onlyOwner {
        admins[_admin] = true;
    }

    function removeAdmin(address _admin) external onlyOwner {
        admins[_admin] = false;
    }

    function addHouse(
        string memory _title,
        string memory _description,
        string memory _imageHash,
        uint256 _startPrice
    ) external onlyAdmin {
        uint256 houseId = _houseIdCounter.current();
        _houseIdCounter.increment();

        houses[houseId] = House({
            id: houseId,
            title: _title,
            description: _description,
            imageHash: _imageHash,
            startPrice: _startPrice,
            isActive: true,
            isStarted: false,
            isAuctionEnded: false,
            highestBidder: address(0),
            highestBid: 0
        });

        emit HouseAdded(houseId, msg.sender);
    }

    function updateHouse(
        uint256 _houseId,
        string memory _title,
        string memory _description,
        string memory _imageHash,
        uint256 _startPrice
    ) external onlyAdmin {
        require(houses[_houseId].id != 0, "House doesn't exist");
        
        House storage house = houses[_houseId];
        house.title = _title;
        house.description = _description;
        
        if (bytes(_imageHash).length > 0) {
            house.imageHash = _imageHash;
        }
        
        house.startPrice = _startPrice;

        emit HouseUpdated(_houseId, msg.sender);
    }

    function deleteHouse(uint256 _houseId) external onlyAdmin {
        require(houses[_houseId].id != 0, "House doesn't exist");
        require(!houses[_houseId].isStarted || houses[_houseId].isAuctionEnded, "Auction in progress");
        
        delete houses[_houseId];
        emit HouseDeleted(_houseId);
    }

    function startAuction(uint256 _houseId) external onlyAdmin {
        House storage house = houses[_houseId];
        require(house.id != 0, "House doesn't exist");
        require(!house.isStarted, "Auction already started");
        require(house.isActive, "House not active");

        house.isStarted = true;
        emit AuctionStarted(_houseId, msg.sender);
    }

    function endAuction(uint256 _houseId) external onlyAdmin {
        House storage house = houses[_houseId];
        require(house.id != 0, "House doesn't exist");
        require(house.isStarted, "Auction not started");
        require(!house.isAuctionEnded, "Auction already ended");

        house.isAuctionEnded = true;
        emit AuctionEnded(_houseId, house.highestBidder);
    }

    function toggleAuctionStatus(uint256 _houseId) external onlyAdmin {
        House storage house = houses[_houseId];
        require(house.id != 0, "House doesn't exist");
        require(!house.isStarted, "Cannot toggle active status after auction starts");

        house.isActive = !house.isActive;
    }

    function placeBid(uint256 _houseId) external payable nonReentrant {
        House storage house = houses[_houseId];
        require(house.id != 0, "House doesn't exist");
        require(house.isActive && house.isStarted && !house.isAuctionEnded, "Auction not active");
        require(msg.value > house.highestBid, "Bid too low");
        require(msg.value >= house.startPrice, "Below starting price");

        if (house.highestBidder != address(0)) {
            payable(house.highestBidder).transfer(house.highestBid);
        }

        house.highestBid = msg.value;
        house.highestBidder = msg.sender;
        bids[_houseId].push(Bid({
            bidder: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp
        }));

        emit BidPlaced(_houseId, msg.sender, msg.value);
    }

    function getHouse(uint256 _houseId) external view returns (House memory) {
        return houses[_houseId];
    }

    function getBidCount(uint256 _houseId) external view returns (uint256) {
        return bids[_houseId].length;
    }

    function getBid(uint256 _houseId, uint256 _bidIndex) external view returns (Bid memory) {
        return bids[_houseId][_bidIndex];
    }

    function houseCounter() external view returns (uint256) {
        return _houseIdCounter.current();
    }

    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}