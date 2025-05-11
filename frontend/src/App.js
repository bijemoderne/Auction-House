import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import HouseAuctionABI from './HouseAuctionABI.json';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from './logo.png';

const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Replace with your deployed contract address

function App() {
  // State declarations
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState(null);
  const [houses, setHouses] = useState([]);
  const [menu, setMenu] = useState('auctions');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [editHouseId, setEditHouseId] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bidHistory, setBidHistory] = useState({});
  const [showBidHistory, setShowBidHistory] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Helper functions
  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      showMessage('danger', 'Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showMessage('danger', 'Image size should be less than 2MB');
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setImageFile(file);
      setImagePreview(base64);
    } catch (err) {
      console.error("Image conversion error:", err);
      showMessage('danger', 'Failed to process image');
    }
  };

  // Contract interaction functions
  const checkNetwork = async () => {
    if (!window.ethereum) return false;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      return chainId === '0x7a69' || chainId === '0x31337'; // Hardhat/Localhost chain IDs
    } catch (err) {
      console.error("Network check failed:", err);
      return false;
    }
  };

  const initEthereum = async () => {
    try {
      if (!window.ethereum) {
        showMessage('danger', 'Please install MetaMask to use this DApp');
        return;
      }

      setIsLoading(true);
      showMessage('info', 'Connecting to MetaMask...');

      // Check and switch network if needed
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x7a69' }],
          });
        } catch (switchError) {
          showMessage('danger', 'Please connect to the correct network (Localhost 8545)');
          return;
        }
      }

      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS, 
        HouseAuctionABI, 
        signer
      );

      // Verify contract connection
      try {
        await contract.houseCounter();
      } catch (err) {
        throw new Error("Failed to connect to contract. Wrong address or ABI?");
      }

      setProvider(browserProvider);
      setSigner(signer);
      setContract(contract);
      setAccount(accounts[0]);
      setIsConnected(true);

      // Check admin status
      const isAdmin = await contract.admins(signer.address);
      setIsAdmin(isAdmin);
      
      await loadHouses(contract);
      showMessage('success', 'Connected to MetaMask successfully!');
    } catch (err) {
      console.error("Ethereum initialization error:", err);
      showMessage('danger', err.message || 'Failed to connect to MetaMask');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHouses = async (contractInstance = contract) => {
    if (!contractInstance) return;
    
    try {
      setIsLoading(true);
      const houseCount = Number(await contractInstance.houseCounter());
      const housesList = [];
      const history = {};
      
      for (let i = 1; i <= houseCount; i++) { // Start from 1 as house IDs start from 1
        try {
          const house = await contractInstance.getHouse(i);
          // Check if house exists (id should not be 0)
          if (house && house.id.toString() !== '0') {
            const bidCount = Number(await contractInstance.getBidCount(i));
            const bids = [];
            
            for (let j = 0; j < bidCount; j++) {
              const bid = await contractInstance.getBid(i, j);
              bids.push({
                bidder: bid.bidder,
                amount: ethers.formatEther(bid.amount),
                timestamp: new Date(Number(bid.timestamp) * 1000)
              });
            }
            
            history[i] = bids;
            
            housesList.push({
              id: house.id.toString(),
              title: house.title,
              description: house.description,
              imageHash: house.imageHash,
              startPrice: ethers.formatEther(house.startPrice),
              isActive: house.isActive,
              isStarted: house.isStarted,
              isAuctionEnded: house.isAuctionEnded,
              highestBidder: house.highestBidder,
              highestBid: ethers.formatEther(house.highestBid),
              bidCount: bidCount.toString()
            });
          }
        } catch (err) {
          console.error(`Error loading house ${i}:`, err);
          // Skip this house if there's an error (likely doesn't exist)
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
  };

  // Event handlers
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      showMessage('info', 'Please connect to MetaMask');
      setIsConnected(false);
      setAccount(null);
    } else {
      setAccount(accounts[0]);
      window.location.reload();
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const handleAdminLogin = (e) => {
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
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setMenu('auctions');
    showMessage('success', 'Logged out successfully');
  };

  // Transaction handler
  const handleContractTransaction = async (contractMethod, args = [], value = null) => {
    try {
      setIsLoading(true);
      showMessage('info', 'Processing transaction...');

      if (!window.ethereum || !account) {
        throw new Error('Please connect your wallet first');
      }

      if (!contract) {
        throw new Error('Contract not initialized');
      }

      const txOptions = {};
      if (value) {
        txOptions.value = ethers.parseEther(value.toString());
      }

      const tx = await contractMethod(...args, txOptions);
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      return receipt;
    } catch (error) {
      console.error('Transaction error:', error);
      
      let errorMessage = 'Transaction failed';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message.includes('user rejected transaction')) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient balance for transaction';
      } else if (error.message.includes('nonce too low')) {
        errorMessage = 'Nonce error - please try again';
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message.includes('House doesn\'t exist')) {
        errorMessage = 'House not found - please refresh the list';
      }

      showMessage('danger', errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // House CRUD Operations
  const handleAddHouse = async () => {
    if (!title || !description || !startPrice) {
      showMessage('danger', 'Please fill all required fields');
      return;
    }

    try {
      const priceInWei = ethers.parseEther(startPrice);
      const imageData = imagePreview || '';

      await handleContractTransaction(
        contract.addHouse,
        [title, description, imageData, priceInWei]
      );

      showMessage('success', 'House added successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setImageFile(null);
      setImagePreview('');
      setStartPrice('');
      
      await loadHouses();
    } catch (error) {
      // Error already handled in handleContractTransaction
    }
  };

  const handleUpdateHouse = async (id) => {
    if (!title || !description || !startPrice) {
      showMessage('danger', 'Please fill all required fields');
      return;
    }

    try {
      const priceInWei = ethers.parseEther(startPrice);
      const imageData = imageFile ? await convertToBase64(imageFile) : imagePreview;

      await handleContractTransaction(
        contract.updateHouse,
        [id, title, description, imageData, priceInWei]
      );

      showMessage('success', 'House updated successfully!');
      
      // Reset form
      setEditHouseId(null);
      setTitle('');
      setDescription('');
      setImageFile(null);
      setImagePreview('');
      setStartPrice('');
      
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  const handleDeleteHouse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this house?')) return;

    try {
      await handleContractTransaction(
        contract.deleteHouse,
        [id]
      );
      
      showMessage('success', 'House deleted successfully!');
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  // Auction Management
  const handleStartAuction = async (id) => {
    try {
      await handleContractTransaction(
        contract.startAuction,
        [id]
      );
      
      showMessage('success', 'Auction started successfully!');
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  const handleEndAuction = async (id) => {
    try {
      await handleContractTransaction(
        contract.endAuction,
        [id]
      );
      
      showMessage('success', 'Auction ended successfully!');
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  const handleToggleAuctionStatus = async (id) => {
    try {
      await handleContractTransaction(
        contract.toggleAuctionStatus,
        [id]
      );
      
      showMessage('success', 'Auction status updated!');
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  // Bid Management
  const handlePlaceBid = async (houseId) => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      showMessage('danger', 'Please enter a valid bid amount');
      return;
    }

    try {
      await handleContractTransaction(
        contract.placeBid,
        [houseId],
        bidAmount
      );

      showMessage('success', 'Bid placed successfully!');
      setBidAmount('');
      setSelectedHouse(null);
      await loadHouses();
    } catch (error) {
      // Error already handled
    }
  };

  // Render functions
  const renderCard = (title, content) => (
    <div className="card mb-3">
      <div className="card-header text-white bg-primary">{title}</div>
      <div className="card-body">{content}</div>
    </div>
  );

  const renderHouseImage = (house) => {
    if (house.imageHash) {
      if (house.imageHash.startsWith('data:image')) {
        return (
          <img 
            src={house.imageHash} 
            className="card-img-top" 
            alt={house.title} 
            style={{ height: '200px', objectFit: 'cover' }}
          />
        );
      } else {
        return (
          <img 
            src={`https://ipfs.io/ipfs/${house.imageHash}`} 
            className="card-img-top" 
            alt={house.title} 
            style={{ height: '200px', objectFit: 'cover' }}
          />
        );
      }
    }
    return (
      <div 
        className="card-img-top bg-secondary d-flex align-items-center justify-content-center" 
        style={{ height: '200px' }}
      >
        <i className="bi bi-image text-white" style={{ fontSize: '3rem' }}></i>
      </div>
    );
  };

  const renderBidHistoryModal = (houseId) => {
    const bids = bidHistory[houseId] || [];
    const house = houses.find(h => h.id === houseId.toString());
    
    return (
      <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Bid History for {house?.title}</h5>
              <button type="button" className="btn-close" onClick={() => setShowBidHistory(null)}></button>
            </div>
            <div className="modal-body">
              {bids.length === 0 ? (
                <p>No bids yet</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Bidder Address</th>
                        <th>Amount (ETH)</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((bid, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            {bid.bidder.substring(0, 6)}...{bid.bidder.substring(38)}
                            {bid.bidder.toLowerCase() === account?.toLowerCase() && (
                              <span className="badge bg-primary ms-2">You</span>
                            )}
                          </td>
                          <td>{bid.amount}</td>
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

  const renderHouseCard = (house) => (
    <div className="col-md-4 mb-4" key={house.id}>
      <div className="card h-100">
        {renderHouseImage(house)}
        <div className="card-body">
          <h5 className="card-title">{house.title}</h5>
          <p className="card-text">{house.description}</p>
          <ul className="list-group list-group-flush">
            <li className="list-group-item">
              <strong>Starting Price:</strong> {house.startPrice} ETH
            </li>
            <li className="list-group-item">
              <strong>Current Bid:</strong> {house.highestBid || '0'} ETH
              {house.bidCount > 0 && (
                <button 
                  className="btn btn-link btn-sm p-0 ms-2"
                  onClick={() => setShowBidHistory(house.id)}
                  title="View bid history"
                >
                  <i className="bi bi-clock-history"></i> ({house.bidCount})
                </button>
              )}
            </li>
            <li className="list-group-item">
              <strong>Status:</strong> {house.isAuctionEnded ? 'Ended' : house.isStarted ? 'Ongoing' : 'Not Started'}
            </li>
            {house.highestBidder && (
              <li className="list-group-item">
                <strong>Leader:</strong> {house.highestBidder.substring(0, 6)}...{house.highestBidder.substring(38)}
                {house.highestBidder.toLowerCase() === account?.toLowerCase() && (
                  <span className="badge bg-primary ms-2">You</span>
                )}
              </li>
            )}
          </ul>
        </div>
        <div className="card-footer">
          {!house.isAuctionEnded && house.isStarted && (
            <button 
              className="btn btn-primary w-100 mb-2"
              onClick={() => setSelectedHouse(house)}
            >
              Place Bid
            </button>
          )}
          {isAdmin && (
            <>
              {!house.isStarted && (
                <>
                  <button 
                    className="btn btn-success w-100 mb-2"
                    onClick={() => handleStartAuction(house.id)}
                  >
                    Start Auction
                  </button>
                  <button 
                    className="btn btn-warning w-100 mb-2"
                    onClick={() => handleToggleAuctionStatus(house.id)}
                  >
                    {house.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </>
              )}
              {house.isStarted && !house.isAuctionEnded && (
                <button 
                  className="btn btn-danger w-100 mb-2"
                  onClick={() => handleEndAuction(house.id)}
                >
                  End Auction
                </button>
              )}
              <div className="d-flex justify-content-between mt-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => { 
                    setEditHouseId(house.id); 
                    setTitle(house.title);
                    setDescription(house.description);
                    setImageFile(null);
                    setImagePreview(house.imageHash);
                    setStartPrice(house.startPrice);
                    setMenu('manage');
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDeleteHouse(house.id)}
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderImageUploadField = () => (
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
            style={{ maxWidth: '100%', maxHeight: '200px' }} 
          />
        </div>
      )}
    </div>
  );

  // Main component render
  return (
    <div className="container mt-4">
      {/* Loading overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-white">Processing transaction...</p>
        </div>
      )}

      <div className="text-center mb-4">
        <img src={logo} alt="Auction Logo" style={{ width: '100px', marginBottom: '1rem' }} />
        <h3>Welcome to House Auction DApp</h3>
        <div className="d-flex justify-content-center gap-2 mb-3">
          {!isConnected ? (
            <button 
              className="btn btn-primary"
              onClick={initEthereum}
            >
              <i className="bi bi-plug-fill me-2"></i>
              Connect Wallet
            </button>
          ) : (
            <span className="badge bg-success p-2">
              <i className="bi bi-check-circle-fill me-2"></i>
              Connected: {account.substring(0, 6)}...{account.substring(38)}
            </span>
          )}
          {isConnected && isAdmin && (
            <button 
              className="btn btn-danger" 
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Logout Admin
            </button>
          )}
        </div>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type} text-center`} role="alert">
          {message.text}
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${menu === 'auctions' ? 'active' : ''}`} 
            onClick={() => setMenu('auctions')}>
            <i className="bi bi-house me-1"></i>Auctions
          </button>
        </li>
        {isAdmin && (
          <li className="nav-item">
            <button className={`nav-link ${menu === 'manage' ? 'active' : ''}`} 
              onClick={() => setMenu('manage')}>
              <i className="bi bi-gear me-1"></i>Manage Houses
            </button>
          </li>
        )}
        <li className="nav-item" style={{ marginLeft: 'auto' }}>
          {!isAdmin ? (
            <button 
              className={`nav-link ${menu === 'login' ? 'active' : ''}`} 
              onClick={() => setMenu('login')}
              style={{ backgroundColor: '#dc3545', color: 'white', borderRadius: '5px' }}
            >
              <i className="bi bi-shield-lock me-1"></i>Admin Login
            </button>
          ) : (
            <button 
              className="nav-link" 
              onClick={handleLogout}
              style={{ backgroundColor: '#dc3545', color: 'white', borderRadius: '5px' }}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Logout
            </button>
          )}
        </li>
      </ul>

      {menu === 'login' && (
        <div className="card mx-auto mb-4" style={{ maxWidth: '400px' }}>
          <div className="card-header bg-danger text-white">
            <h5 className="mb-0 text-center">Admin Login</h5>
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
              <div className="d-grid">
                <button type="submit" className="btn btn-danger">
                  <i className="bi bi-shield-lock me-1"></i>Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {menu === 'auctions' && (
        <div className="row">
          {selectedHouse && (
            <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Place Bid on {selectedHouse.title}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedHouse(null)}></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Your Bid (ETH)</label>
                      <input
                        type="number"
                        className="form-control"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={selectedHouse.highestBid || selectedHouse.startPrice}
                        step="0.01"
                        required
                      />
                      <div className="form-text">
                        Current highest bid: {selectedHouse.highestBid || 'None'} ETH
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setSelectedHouse(null)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={() => handlePlaceBid(selectedHouse.id)}
                      disabled={!bidAmount || parseFloat(bidAmount) <= parseFloat(selectedHouse.highestBid || selectedHouse.startPrice)}
                    >
                      Submit Bid
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {showBidHistory && renderBidHistoryModal(showBidHistory)}
          
          {houses.filter(house => house.isActive).map(house => renderHouseCard(house))}
        </div>
      )}

      {menu === 'manage' && isAdmin && (
        <div className="row">
          <div className="col-md-4 mb-4">
            <div className="card">
              <div className="card-header bg-primary text-white">
                {editHouseId ? 'Update House' : 'Add New House'}
              </div>
              <div className="card-body">
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>
                {renderImageUploadField()}
                <div className="mb-3">
                  <label className="form-label">Starting Price (ETH)*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={startPrice}
                    onChange={(e) => setStartPrice(e.target.value)}
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                <button
                  className="btn btn-primary w-100"
                  onClick={editHouseId ? () => handleUpdateHouse(editHouseId) : handleAddHouse}
                  disabled={!title || !description || !startPrice}
                >
                  {editHouseId ? 'Update House' : 'Add House'}
                </button>
                {editHouseId && (
                  <button
                    className="btn btn-secondary w-100 mt-2"
                    onClick={() => {
                      setEditHouseId(null);
                      setTitle('');
                      setDescription('');
                      setImageFile(null);
                      setImagePreview('');
                      setStartPrice('');
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-md-8">
            <div className="row">
              {houses.map(house => renderHouseCard(house))}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background-color: white;
          padding: 20px;
          border-radius: 5px;
          max-width: 500px;
          width: 100%;
        }
      `}</style>
    </div>
  );
}

export default App;