import React, { useState } from 'react';
import InterestCalculator from './InterestCalculator';
import TransactionHistory from './TransactionHistory';
import GoldImageViewer from './GoldImageViewer';
import ImageSizeControl from './ImageSizeControl';
import HistoricalEntryForm from './HistoricalEntryForm';
import { calculateActualInterestEarned, calculateTotalPayments } from '../utils/calculations';
import { customerAPI } from '../services/api';
import './Dashboard.css'; // <-- IMPORT THE NEW CSS FILE

const Dashboard = ({ customers = [], onUpdateCustomer, onDeleteCustomer, onRefresh, onAddCustomer, imageDisplaySize = 'medium', onImageSizeChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedCustomerImages, setSelectedCustomerImages] = useState([]);
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);

  const handleApplyInterestToAll = async () => {
    try {
      await customerAPI.applyInterestToAll();
      onRefresh();
      // Using a custom modal or toast notification is better than alert() in a real app
    } catch (err) {
      console.error(`Error applying interest: ${err.message}`);
    }
  };

  const handlePayment = async (customerId, amount) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) return;

    const updatedCustomer = {
      ...customer,
      currentBalance: customer.currentBalance - paymentAmount,
      lastInterestDate: customer.lastInterestDate,
      newTransaction: {
        type: 'payment',
        amount: paymentAmount,
        description: `Payment received - reducing outstanding balance`
      }
    };
    await onUpdateCustomer(updatedCustomer);
  };

  const handleViewImages = (customer) => {
    setSelectedCustomerImages(customer.goldImages || []);
    setShowImageViewer(true);
  };

  const handleAddHistoricalCustomer = async (customerData) => {
    try {
      await onAddCustomer(customerData);
      setShowHistoricalForm(false);
      onRefresh();
    } catch (err) {
      console.error(`Error adding historical customer: ${err.message}`);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (customer.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const toggleCustomerDetails = (customerId) => {
    setSelectedCustomerId(selectedCustomerId === customerId ? null : customerId);
  };

  const totalLentAmount = customers.reduce((sum, customer) => sum + (customer.lentAmount || 0), 0);
  const totalOutstandingBalance = customers.reduce((sum, customer) => sum + (customer.currentBalance || customer.current_balance || 0), 0);
  const totalInterestEarned = customers.reduce((sum, customer) => sum + calculateActualInterestEarned(customer), 0);
  const totalPayments = customers.reduce((sum, customer) => sum + calculateTotalPayments(customer), 0);

  const getImageDisplayStyle = () => {
    const sizeMap = {
      small: { width: '60px', height: '60px' },
      medium: { width: '80px', height: '80px' },
      large: { width: '100px', height: '100px' }
    };
    return sizeMap[imageDisplaySize] || sizeMap.medium;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* === UPDATED CONTROLS SECTION === */}
        <div className="dashboard-controls">
          <ImageSizeControl currentSize={imageDisplaySize} onSizeChange={onImageSizeChange} />
          <div className="action-buttons-group">
            <button onClick={() => setShowHistoricalForm(true)} className="action-button">
              Add Historical Entry
            </button>
            <button onClick={handleApplyInterestToAll} className="action-button primary">
              Apply Interest to All
            </button>
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="card">
          <h3>Total Customers</h3>
          <div className="stat-number">{customers.length}</div>
        </div>
        <div className="card">
          <h3>Total Lent Amount</h3>
          <div className="stat-number">₹{totalLentAmount.toLocaleString()}</div>
        </div>
        <div className="card">
          <h3>Total Outstanding</h3>
          <div className="stat-number">₹{totalOutstandingBalance.toLocaleString()}</div>
        </div>
        <div className="card">
          <h3>Total Interest Earned</h3>
          <div className="stat-number">₹{totalInterestEarned.toLocaleString()}</div>
        </div>
        <div className="card">
          <h3>Total Payments</h3>
          <div className="stat-number">₹{totalPayments.toLocaleString()}</div>
        </div>
      </div>

      <div className="customers-grid">
        {filteredCustomers.map(customer => {
          const interestEarned = calculateActualInterestEarned(customer);
          const totalPayments = calculateTotalPayments(customer);
          const goldImages = customer.goldImages || [];
          const imageStyle = getImageDisplayStyle();
          
          const currentBalance = customer.currentBalance || customer.current_balance || 0;
          const lentAmount = customer.lentAmount || customer.lent_amount || 0;
          const goldWeight = customer.goldWeight || customer.gold_weight || 0;
          const goldRate = customer.goldRate || customer.gold_rate || 0;
          const lentDate = customer.lentDate || customer.lent_date || customer.created_at || null;

          return (
            <div key={customer.id} className="customer-card">
              <div className="customer-info">
                <h4>{customer.name}</h4>
                <p><strong>Email:</strong> {customer.email}</p>
                {goldWeight > 0 && <p><strong>Gold Weight:</strong> {goldWeight.toFixed(3)}g</p>}
                {goldRate > 0 && <p><strong>Gold Rate:</strong> ₹{goldRate.toLocaleString()}/g</p>}
                {/* === CORRECTED LINE === */}
                <p><strong>Lent Date:</strong> {lentDate ? new Date(lentDate).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Original Lent Amount:</strong> ₹{lentAmount.toLocaleString()}</p>
                <p><strong>Current Outstanding:</strong> ₹{currentBalance.toLocaleString()}</p>
                <p><strong>Interest Earned:</strong> ₹{interestEarned.toLocaleString()}</p>
                <p><strong>Total Payments:</strong> ₹{totalPayments.toLocaleString()}</p>
                <div className="balance-info">
                  <span className="balance">Current: ₹{currentBalance.toLocaleString()}</span>
                  <span className="interest-preview"> &emsp;&emsp;&emsp;Interest:₹{interestEarned.toLocaleString()}</span>
                </div>
                {goldImages.length > 0 && (
                  <div className="gold-images-preview">
                    <div className="images-grid">
                      {goldImages.slice(0, 3).map(image => (
                        <img key={image.id} src={image.data} alt={image.name} className="preview-image" style={imageStyle} onClick={() => handleViewImages(customer)} />
                      ))}
                      {goldImages.length > 3 && (
                        <div className="more-images-indicator" onClick={() => handleViewImages(customer)}>
                          +{goldImages.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* === UPDATED CUSTOMER ACTION BUTTONS === */}
              <div className="customer-actions">
                <button 
                  onClick={() => toggleCustomerDetails(customer.id)}
                  className="action-button secondary"
                >
                  {selectedCustomerId === customer.id ? 'Hide Details' : 'View Details'}
                </button>
                <button 
                  onClick={() => onDeleteCustomer(customer.id)}
                  className="action-button danger"
                  disabled={currentBalance > 0}
                >
                  Delete
                </button>
              </div>

              {selectedCustomerId === customer.id && (
                <div className="customer-details">
                  <InterestCalculator customer={{...customer, currentBalance, lentAmount}} onPayment={handlePayment} />
                  <TransactionHistory transactions={customer.transactions} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showImageViewer && <GoldImageViewer images={selectedCustomerImages} onClose={() => setShowImageViewer(false)} displaySize={imageDisplaySize} />}
      {showHistoricalForm && <HistoricalEntryForm onAddCustomer={handleAddHistoricalCustomer} onClose={() => setShowHistoricalForm(false)} />}
    </div>
  );
};

export default Dashboard;
