import React, { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import HouseAuctionABI from './HouseAuctionABI.json';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from './logo.png';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

function App() {
  // State declarations
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [houses, setHouses] = useState([]);
  const [menu, setMenu] = useState('auctions');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState({ show: false, message: '', hash: '' });
  
  // House management
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [location, setLocation] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [auctionStartDate, setAuctionStartDate] = useState('');
  const [auctionStartTime, setAuctionStartTime] = useState('');
  const [auctionDuration, setAuctionDuration] = useState(1);
  const [editHouseId, setEditHouseId] = useState(null);
  
  // Bidding
  const [bidAmount, setBidAmount] = useState('');
  const [selectedHouse, setSelectedHouse] = useState(null);
  
  // Admin system
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Bid history
  const [bidHistory, setBidHistory] = useState({});
  const [showBidHistory, setShowBidHistory] = useState(null);

  // Initialize Ethereum connection
  const initEthereum = useCallback(async () => {
    try {
      if (!window.ethereum) {
        showMessage('danger', 'Please install MetaMask to use this DApp');
        return;
      }

      setIsLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HouseAuctionABI, signer);

      setProvider(browserProvider);
      setSigner(signer);
      setContract(contract);
      setAccount(accounts[0]);
      setNetwork(network.name);
      
      const contractAdmin = await contract.admin();
      setIsAdmin(contractAdmin.toLowerCase() === accounts[0].toLowerCase());
      
      await loadHouses(contract);
    } catch (err) {
      console.error("Ethereum initialization error:", err);
      showMessage('danger', err.reason || 'Failed to connect to MetaMask');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper functions
  const showMessage = useCallback((type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  }, []);

  const showTxStatus = (message, hash = '') => {
    setTxStatus({ show: true, message, hash });
  };

  const hideTxStatus = () => {
    setTxStatus({ show: false, message: '', hash: '' });
  };

  const convertToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 2 * 1024 * 1024) {
        reject(new Error('Image size should be less than 2MB'));
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }, []);

  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!file.type.match('image.*')) {
        showMessage('danger', 'Please select an image file');
        return;
      }

      setImageFile(file);
      const base64 = await convertToBase64(file);
      setImagePreview(base64);
    } catch (err) {
      console.error("Image upload error:", err);
      showMessage('danger', err.message);
    }
  }, [convertToBase64, showMessage]);

  // Admin functions
  const handleAdminLogin = useCallback((e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAdmin(true);
      localStorage.setItem('isAdmin', 'true');
      setMenu('manage');
      showMessage('success', 'Admin login successful!');
      setUsername('');
      setPassword('');
    } else {
      showMessage('danger', 'Invalid credentials');
    }
  }, [username, password, showMessage]);

  const handleLogout = useCallback(() => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setMenu('auctions');
    showMessage('success', 'Logged out successfully');
  }, [showMessage]);

  // Contract interactions
  const loadHouses = useCallback(async (contractInstance = contract) => {
    if (!contractInstance) return;
    
    try {
      setIsLoading(true);
      const houseCount = await contractInstance.houseCounter();
      const housesList = [];
      const history = {};
      
      for (let i = 1; i <= houseCount; i++) {
        try {
          const house = await contractInstance.getHouse(i);
          if (house[0] !== 0) {
            const bids = [];
            const bidCount = house[13];
            
            for (let j = 0; j < bidCount; j++) {
              const bid = await contractInstance.getBid(i, j);
              bids.push({
                bidder: bid[0],
                amount: ethers.formatEther(bid[1]),
                timestamp: new Date(Number(bid[2]) * 1000)
              });
            }
            
            history[i] = bids;
            
            housesList.push({
              id: house[0].toString(),
              title: house[1],
              description: house[2],
              imageHash: house[3],
              location: house[4],
              startPrice: ethers.formatEther(house[5]),
              auctionStartTime: Number(house[6]),
              auctionEndTime: Number(house[7]),
              highestBidder: house[8],
              highestBid: ethers.formatEther(house[9]),
              isActive: house[10],
              isStarted: house[11],
              isAuctionEnded: house[12],
              bidCount: house[13].toString()
            });
          }
        } catch (err) {
          console.error(`Error loading house ${i}:`, err);
        }
      }
      
      setHouses(housesList);
      setBidHistory(history);
    } catch (err) {
      console.error("Error loading houses:", err);
      showMessage('danger', 'Failed to load houses. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [contract, showMessage]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStartPrice('');
    setAuctionStartDate('');
    setAuctionStartTime('');
    setAuctionDuration(1);
    setImageFile(null);
    setImagePreview('');
    setEditHouseId(null);
  };

  const handleAddHouse = useCallback(async () => {
    if (!title || !description || !location || !startPrice || !auctionStartDate || !auctionStartTime) {
      showMessage('danger', 'Please fill all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const priceInWei = ethers.parseEther(startPrice);
      const startDateTime = new Date(`${auctionStartDate}T${auctionStartTime}:00Z`);
      const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
      const endTimestamp = startTimestamp + (auctionDuration * 86400);

      let imageData = imagePreview || '';

      showTxStatus('Preparing transaction...');
      
      const tx = await contract.addHouse(
        title,
        description,
        imageData,
        location,
        priceInWei,
        startTimestamp,
        endTimestamp,
        { gasLimit: 500000 }
      );

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'House added successfully!');
        resetForm();
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Add House Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to add house');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [title, description, location, startPrice, auctionStartDate, auctionStartTime, auctionDuration, imagePreview, contract, loadHouses, showMessage]);

  const handleUpdateHouse = useCallback(async (id) => {
    try {
      setIsLoading(true);
      const priceInWei = ethers.parseEther(startPrice);
      const startDateTime = new Date(`${auctionStartDate}T${auctionStartTime}:00Z`);
      const startTimestamp = Math.floor(startDateTime.getTime() / 1000);
      const endTimestamp = startTimestamp + (auctionDuration * 86400);
      
      let imageData = imageFile ? await convertToBase64(imageFile) : imagePreview;

      showTxStatus('Updating house...');
      const tx = await contract.updateHouse(
        id,
        title,
        description,
        imageData,
        location,
        priceInWei,
        startTimestamp,
        endTimestamp,
        { gasLimit: 500000 }
      );

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'House updated successfully!');
        resetForm();
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Update House Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to update house');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [title, description, location, startPrice, auctionStartDate, auctionStartTime, auctionDuration, imageFile, imagePreview, contract, loadHouses, showMessage, convertToBase64]);

  const handleDeleteHouse = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to delete this house?')) return;
    
    try {
      setIsLoading(true);
      showTxStatus('Deleting house...');
      const tx = await contract.deleteHouse(id, { gasLimit: 500000 });

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'House deleted successfully!');
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Delete House Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to delete house');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [contract, loadHouses, showMessage]);

  const handlePlaceBid = useCallback(async (houseId) => {
    if (!bidAmount) {
      showMessage('danger', 'Please enter a bid amount');
      return;
    }

    try {
      setIsLoading(true);
      const amountInWei = ethers.parseEther(bidAmount);
      showTxStatus('Placing bid...');
      
      const tx = await contract.placeBid(houseId, { 
        value: amountInWei,
        gasLimit: 500000 
      });

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'Bid placed successfully!');
        setBidAmount('');
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Place Bid Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to place bid');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [bidAmount, contract, loadHouses, showMessage]);

  const handleStartAuction = useCallback(async (id) => {
    try {
      setIsLoading(true);
      showTxStatus('Starting auction...');
      const tx = await contract.startAuction(id, { gasLimit: 500000 });

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'Auction started successfully!');
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Start Auction Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to start auction');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [contract, loadHouses, showMessage]);

  const handleEndAuction = useCallback(async (id) => {
    try {
      setIsLoading(true);
      showTxStatus('Ending auction...');
      const tx = await contract.endAuction(id, { gasLimit: 500000 });

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'Auction ended successfully!');
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("End Auction Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to end auction');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [contract, loadHouses, showMessage]);

  const handleToggleAuctionStatus = useCallback(async (id) => {
    try {
      setIsLoading(true);
      showTxStatus('Toggling auction status...');
      const tx = await contract.toggleAuctionStatus(id, { gasLimit: 500000 });

      showTxStatus('Waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        showMessage('success', 'Auction status updated!');
        await loadHouses();
      } else {
        showMessage('danger', 'Transaction failed');
      }
    } catch (err) {
      console.error("Toggle Status Error:", err);
      showMessage('danger', err.reason || err.message || 'Failed to toggle status');
    } finally {
      setIsLoading(false);
      hideTxStatus();
    }
  }, [contract, loadHouses, showMessage]);

  const prepareEditForm = (house) => {
    setEditHouseId(house.id);
    setTitle(house.title);
    setDescription(house.description);
    setImagePreview(house.imageHash);
    setLocation(house.location);
    setStartPrice(house.startPrice);
    
    const startDate = new Date(house.auctionStartTime * 1000);
    setAuctionStartDate(startDate.toISOString().split('T')[0]);
    setAuctionStartTime(startDate.toTimeString().substring(0, 5));
    
    const duration = (house.auctionEndTime - house.auctionStartTime) / 86400;
    setAuctionDuration(duration);
    
    setMenu('manage');
  };

  // Event listeners
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
        window.location.reload();
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initEthereum();
  }, [initEthereum]);

  // Render functions
  const renderHouseForm = () => (
    <div className="card mb-4">
      <div className="card-header">
        <h4>{editHouseId ? 'Edit House' : 'Add New House'}</h4>
      </div>
      <div className="card-body">
        <form onSubmit={(e) => {
          e.preventDefault();
          editHouseId ? handleUpdateHouse(editHouseId) : handleAddHouse();
        }}>
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Title*</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description*</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Location*</label>
                <input
                  type="text"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Starting Price (ETH)*</label>
                <input
                  type="number"
                  className="form-control"
                  min="0.01"
                  step="0.01"
                  value={startPrice}
                  onChange={(e) => setStartPrice(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">House Image</label>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {imagePreview && (
                  <div className="mt-2">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="img-thumbnail" 
                      style={{ maxHeight: '200px' }}
                    />
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Auction Start Date*</label>
                <input
                  type="date"
                  className="form-control"
                  value={auctionStartDate}
                  onChange={(e) => setAuctionStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Auction Start Time*</label>
                <input
                  type="time"
                  className="form-control"
                  value={auctionStartTime}
                  onChange={(e) => setAuctionStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Auction Duration (Days)*</label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={auctionDuration}
                  onChange={(e) => setAuctionDuration(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-end">
            <button 
              type="button" 
              className="btn btn-secondary me-2"
              onClick={resetForm}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isLoading || !title || !description || !location || !startPrice || !auctionStartDate || !auctionStartTime}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                editHouseId ? 'Update House' : 'Add House'
              )}
            </button>
          </div>
        </form>
        
        {(!title || !description || !location || !startPrice || !auctionStartDate || !auctionStartTime) && (
          <div className="alert alert-warning mt-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Please fill all required fields
          </div>
        )}
      </div>
    </div>
  );

  const renderBidForm = (house) => (
    <div className="card mb-4">
      <div className="card-header">
        <h4>Place Bid for {house.title}</h4>
      </div>
      <div className="card-body">
        <form onSubmit={(e) => {
          e.preventDefault();
          handlePlaceBid(house.id);
        }}>
          <div className="mb-3">
            <label className="form-label">Your Bid (ETH)*</label>
            <input
              type="number"
              className="form-control"
              min={parseFloat(house.highestBid) + 0.01 || parseFloat(house.startPrice) + 0.01}
              step="0.01"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              required
            />
            <small className="text-muted">
              Minimum bid: {house.highestBid ? 
                `${(parseFloat(house.highestBid) + 0.01).toFixed(2)} ETH` : 
                `${(parseFloat(house.startPrice) + 0.01).toFixed(2)} ETH`}
            </small>
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading || !bidAmount}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : 'Place Bid'}
          </button>
        </form>
      </div>
    </div>
  );

  const renderBidHistory = (houseId) => {
    const bids = bidHistory[houseId] || [];
    
    return (
      <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Bid History</h5>
              <button 
                type="button" 
                className="btn-close"
                onClick={() => setShowBidHistory(null)}
              ></button>
            </div>
            <div className="modal-body">
              {bids.length === 0 ? (
                <p>No bids yet</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bidder</th>
                        <th>Amount (ETH)</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((bid, index) => (
                        <tr key={index}>
                          <td>{`${bid.bidder.substring(0, 6)}...${bid.bidder.substring(38)}`}</td>
                          <td>{parseFloat(bid.amount).toFixed(4)}</td>
                          <td>{bid.timestamp.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setShowBidHistory(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHouseCards = () => {
    if (houses.length === 0) {
      return (
        <div className="alert alert-info">
          No houses available for auction. {isAdmin && 'Add a new house to get started!'}
        </div>
      );
    }

    return houses.map(house => (
      <div key={house.id} className="col-md-6 col-lg-4 mb-4">
        <div className="card h-100">
          <img 
            src={house.imageHash || 'https://via.placeholder.com/300x200?text=No+Image'} 
            className="card-img-top" 
            alt={house.title}
            style={{ height: '200px', objectFit: 'cover' }}
          />
          <div className="card-body">
            <h5 className="card-title">{house.title}</h5>
            <p className="card-text text-muted">{house.location}</p>
            <p className="card-text">{house.description}</p>
            
            <div className="mb-3">
              <p className="mb-1">
                <strong>Starting Price:</strong> {parseFloat(house.startPrice).toFixed(4)} ETH
              </p>
              <p className="mb-1">
                <strong>Highest Bid:</strong> {house.highestBid ? parseFloat(house.highestBid).toFixed(4) : '0'} ETH
              </p>
              <p className="mb-1">
                <strong>Status:</strong> {!house.isActive ? 'Inactive' : 
                  house.isAuctionEnded ? 'Ended' : 
                  house.isStarted ? 'Live' : 'Not Started'}
              </p>
              <p className="mb-1">
                <strong>Ends:</strong> {new Date(house.auctionEndTime * 1000).toLocaleString()}
              </p>
              <button 
                className="btn btn-sm btn-outline-info mt-1"
                onClick={() => setShowBidHistory(house.id)}
              >
                View Bid History ({house.bidCount})
              </button>
            </div>
            
            {house.isActive && !house.isAuctionEnded && (
              <button 
                className="btn btn-primary w-100 mb-2"
                onClick={() => setSelectedHouse(house)}
              >
                Place Bid
              </button>
            )}
            
            {isAdmin && (
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-sm btn-outline-secondary flex-grow-1"
                  onClick={() => prepareEditForm(house)}
                >
                  Edit
                </button>
                <button 
                  className="btn btn-sm btn-outline-danger flex-grow-1"
                  onClick={() => handleDeleteHouse(house.id)}
                >
                  Delete
                </button>
                {house.isActive && !house.isStarted && !house.isAuctionEnded && (
                  <button 
                    className="btn btn-sm btn-outline-success flex-grow-1"
                    onClick={() => handleStartAuction(house.id)}
                  >
                    Start
                  </button>
                )}
                {house.isActive && !house.isAuctionEnded && house.isStarted && (
                  <button 
                    className="btn btn-sm btn-outline-warning flex-grow-1"
                    onClick={() => handleEndAuction(house.id)}
                  >
                    End
                  </button>
                )}
                <button 
                  className={`btn btn-sm flex-grow-1 ${house.isActive ? 'btn-outline-dark' : 'btn-outline-success'}`}
                  onClick={() => handleToggleAuctionStatus(house.id)}
                >
                  {house.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    ));
  };

  const renderAdminLogin = () => (
    <div className="card">
      <div className="card-header">
        <h4>Admin Login</h4>
      </div>
      <div className="card-body">
        <form onSubmit={handleAdminLogin}>
          <div className="mb-3">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Login
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="container mt-4">
      {/* Header */}
      <header className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <img src={logo} alt="Logo" style={{ height: '50px', marginRight: '15px' }} />
          <h1 className="mb-0">House Auction DApp</h1>
        </div>
        <div>
          {account ? (
            <div className="d-flex align-items-center">
              <span className="badge bg-secondary me-2">
                {network}
              </span>
              <span className="text-truncate" style={{ maxWidth: '150px' }}>
                {`${account.substring(0, 6)}...${account.substring(38)}`}
              </span>
              {isAdmin && (
                <button 
                  className="btn btn-sm btn-danger ms-2"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={initEthereum}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      {/* Message Alert */}
      {message.text && (
        <div className={`alert alert-${message.type} mb-4`}>
          {message.text}
        </div>
      )}

      {/* Transaction Status Modal */}
      {txStatus.show && (
        <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transaction Status</h5>
              </div>
              <div className="modal-body">
                <p>{txStatus.message}</p>
                {txStatus.hash && (
                  <p>
                    <small>
                      <a 
                        href={`https://${network === 'sepolia' ? 'sepolia.' : ''}etherscan.io/tx/${txStatus.hash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        View on Etherscan
                      </a>
                    </small>
                  </p>
                )}
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav">
              <li className="nav-item">
                <button 
                  className={`nav-link btn ${menu === 'auctions' ? 'active' : ''}`}
                  onClick={() => {
                    setMenu('auctions');
                    setSelectedHouse(null);
                  }}
                >
                  Auctions
                </button>
              </li>
              {isAdmin && (
                <li className="nav-item">
                  <button 
                    className={`nav-link btn ${menu === 'manage' ? 'active' : ''}`}
                    onClick={() => setMenu('manage')}
                  >
                    Manage Houses
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {!account ? (
          <div className="alert alert-warning">
            Please connect your wallet to interact with the DApp
          </div>
        ) : menu === 'manage' && !isAdmin ? (
          renderAdminLogin()
        ) : menu === 'manage' ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2>Manage Houses</h2>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  resetForm();
                  setMenu('manage');
                }}
              >
                Add New House
              </button>
            </div>
            {(editHouseId || (!editHouseId && houses.length === 0)) && renderHouseForm()}
            <div className="row">
              {renderHouseCards()}
            </div>
          </>
        ) : (
          <>
            {selectedHouse ? (
              <>
                <button 
                  className="btn btn-secondary mb-3"
                  onClick={() => setSelectedHouse(null)}
                >
                  ← Back to All Auctions
                </button>
                <div className="row">
                  <div className="col-md-6">
                    <div className="card mb-4">
                      <img 
                        src={selectedHouse.imageHash || 'https://via.placeholder.com/600x400?text=No+Image'} 
                        className="card-img-top" 
                        alt={selectedHouse.title}
                        style={{ maxHeight: '400px', objectFit: 'cover' }}
                      />
                      <div className="card-body">
                        <h3>{selectedHouse.title}</h3>
                        <p className="text-muted">{selectedHouse.location}</p>
                        <p>{selectedHouse.description}</p>
                        <div className="mb-3">
                          <p><strong>Starting Price:</strong> {parseFloat(selectedHouse.startPrice).toFixed(4)} ETH</p>
                          <p><strong>Highest Bid:</strong> {selectedHouse.highestBid ? parseFloat(selectedHouse.highestBid).toFixed(4) : '0'} ETH</p>
                          <p><strong>Status:</strong> {!selectedHouse.isActive ? 'Inactive' : 
                            selectedHouse.isAuctionEnded ? 'Ended' : 
                            selectedHouse.isStarted ? 'Live' : 'Not Started'}</p>
                          <p><strong>Ends:</strong> {new Date(selectedHouse.auctionEndTime * 1000).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    {selectedHouse.isActive && !selectedHouse.isAuctionEnded && renderBidForm(selectedHouse)}
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2 className="mb-4">Current Auctions</h2>
                <div className="row">
                  {renderHouseCards()}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Bid History Modal */}
      {showBidHistory && renderBidHistory(showBidHistory)}

      {/* Footer */}
      <footer className="mt-5 py-4 bg-light">
        <div className="container">
          <div className="row">
            <div className="col-md-6 text-center text-md-start">
              <h5>House Auction DApp</h5>
              <p className="mb-0">Developed by Jeremie BIJE</p>
            </div>
            <div className="col-md-6 text-center text-md-end">
              <a href="#" className="text-decoration-none me-3">
                <i className="bi bi-github"></i> GitHub
              </a>
              <a href="#" className="text-decoration-none me-3">
                <i className="bi bi-linkedin"></i> LinkedIn
              </a>
              <a href="#" className="text-decoration-none">
                <i className="bi bi-envelope-fill"></i> Contact
              </a>
            </div>
          </div>
          <div className="text-center mt-3">
            <small className="text-muted">
              &copy; {new Date().getFullYear()} All rights reserved
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;