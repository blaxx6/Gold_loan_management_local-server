import React, { useState } from 'react';

const HistoricalEntryForm = ({ onAddCustomer, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    idType: 'aadhar',
    idNumber: '',
    goldWeight: '',
    goldRate: '',
    lentAmount: '',
    lentDate: '',
    interestRate: '1.5'
  });

  const [goldImages, setGoldImages] = useState([]);
  const [preview, setPreview] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newImage = {
            id: Date.now() + Math.random(),
            name: file.name,
            data: event.target.result,
            size: file.size,
            type: file.type
          };
          setGoldImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (imageId) => {
    setGoldImages(prev => prev.filter(img => img.id !== imageId));
  };

  // Correct daily simple interest calculation (not compounded)
  const calculateInterestByLentDate = (lentAmount, lentDate, currentDate, rate = 1.5) => {
    const start = new Date(lentDate);
    const end = new Date(currentDate);
    const transactions = [];

    let currentBalance = lentAmount;

    // Add initial lending transaction
    transactions.push({
      id: Date.now(),
      type: 'lending',
      amount: lentAmount,
      description: 'Initial amount lent',
      date: start.toISOString(),
      balance: lentAmount
    });

    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Loop through each day, add daily simple interest (on principal only)
    while (current <= end) {
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      const dailyInterest = (lentAmount * rate) / 100 / daysInMonth;
      currentBalance += dailyInterest;

      transactions.push({
        id: Date.now() + Math.random(),
        type: 'interest',
        amount: dailyInterest,
        description: `Daily interest (${rate}%/month)`,
        date: current.toISOString(),
        balance: currentBalance
      });

      current.setDate(current.getDate() + 1);
    }

    return { transactions, finalBalance: currentBalance };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateMonthsElapsed = (lentDate, currentDate) => {
    const start = new Date(lentDate);
    const end = new Date(currentDate);
    const yearDiff = end.getFullYear() - start.getFullYear();
    const monthDiff = end.getMonth() - start.getMonth();
    const dayDiff = end.getDate() - start.getDate();

    let totalMonths = yearDiff * 12 + monthDiff;

    if (dayDiff < 0) {
      totalMonths -= 1;
      const daysInMonth = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
      const partialMonth = (daysInMonth + dayDiff) / daysInMonth;
      totalMonths += partialMonth;
    } else if (dayDiff > 0) {
      const daysInMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
      const partialMonth = dayDiff / daysInMonth;
      totalMonths += partialMonth;
    }

    return totalMonths.toFixed(2);
  };

  const handlePreview = () => {
    if (!formData.name || !formData.lentAmount || !formData.lentDate) {
      alert('Please fill in all required fields');
      return;
    }

    const lentAmount = parseFloat(formData.lentAmount);
    const lentDate = formData.lentDate;
    const currentDate = new Date().toISOString().split('T')[0];
    const interestRate = parseFloat(formData.interestRate);

    try {
      const historicalData = calculateInterestByLentDate(
        lentAmount,
        lentDate,
        currentDate,
        interestRate
      );

      setPreview({
        ...formData,
        lentAmount,
        currentDate,
        historicalData,
        totalInterest: historicalData.finalBalance - lentAmount,
        monthsElapsed: calculateMonthsElapsed(lentDate, currentDate)
      });
      setShowPreview(true);
    } catch (error) {
      console.error('Error calculating historical data:', error);
      alert('Error calculating interest. Please check your inputs.');
    }
  };

  const handleSubmit = async () => {
    if (!preview) return;

    try {
      const customer = {
        name: formData.name,
        email: formData.email || `${formData.name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: formData.phone || '',
        address: formData.address || '',
        idType: formData.idType,
        idNumber: formData.idNumber || '',
        goldWeight: parseFloat(formData.goldWeight) || 0,
        goldRate: parseFloat(formData.goldRate) || 0,
        lentAmount: preview.lentAmount,
        currentBalance: preview.historicalData.finalBalance,
        lentDate: formData.lentDate,
        lastInterestDate: preview.currentDate,
        accountStatus: 'active',
        transactions: preview.historicalData.transactions,
        goldImages: goldImages
      };

      await onAddCustomer(customer);
      onClose();
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer. Please try again.');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="historical-entry-form">
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Add Historical Customer Entry</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
          </div>

          {!showPreview ? (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>ID Type</label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleInputChange}
                  >
                    <option value="aadhar">Aadhar Card</option>
                    <option value="pan">PAN Card</option>
                    <option value="driving_license">Driving License</option>
                    <option value="voter_id">Voter ID</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gold Weight (grams)</label>
                  <input
                    type="number"
                    name="goldWeight"
                    value={formData.goldWeight}
                    onChange={handleInputChange}
                    step="0.001"
                  />
                </div>
                <div className="form-group">
                  <label>Gold Rate (₹/gram)</label>
                  <input
                    type="number"
                    name="goldRate"
                    value={formData.goldRate}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Lent Amount (₹) *</label>
                  <input
                    type="number"
                    name="lentAmount"
                    value={formData.lentAmount}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Lent Date *</label>
                  <input
                    type="date"
                    name="lentDate"
                    value={formData.lentDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Interest Rate (% per month)</label>
                <input
                  type="number"
                  name="interestRate"
                  value={formData.interestRate}
                  onChange={handleInputChange}
                  step="0.1"
                />
              </div>

              <div className="form-group">
                <label>Gold Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                {goldImages.length > 0 && (
                  <div className="uploaded-images">
                    {goldImages.map(image => (
                      <div key={image.id} className="image-preview">
                        <img
                          src={image.data}
                          alt={image.name}
                          style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(image.id)}
                          className="remove-image-btn"
                        >
                          ×
                        </button>
                        <p>{image.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={onClose} className="btn-secondary">
                  Cancel
                </button>
                <button type="button" onClick={handlePreview} className="btn-primary">
                  Preview Calculations
                </button>
              </div>
            </div>
          ) : (
            <div className="preview-section">
              <div className="preview-summary">
                <h3>Customer Summary</h3>
                <div className="summary-item">
                  <span>Name:</span>
                  <strong>{preview.name}</strong>
                </div>
                <div className="summary-item">
                  <span>Lent Amount:</span>
                  <strong>{formatCurrency(preview.lentAmount)}</strong>
                </div>
                <div className="summary-item">
                  <span>Lent Date:</span>
                  <strong>{formatDate(preview.lentDate)}</strong>
                </div>
                <div className="summary-item">
                  <span>Current Date:</span>
                  <strong>{formatDate(preview.currentDate)}</strong>
                </div>
                <div className="summary-item">
                  <span>Months Elapsed:</span>
                  <strong>{preview.monthsElapsed}</strong>
                </div>
                <div className="summary-item">
                  <span>Total Interest:</span>
                  <strong>{formatCurrency(preview.totalInterest)}</strong>
                </div>
                <div className="summary-item">
                  <span>Current Balance:</span>
                  <strong>{formatCurrency(preview.historicalData.finalBalance)}</strong>
                </div>
              </div>

              <div className="transaction-preview">
                <h5>Transaction History</h5>
                <div className="transaction-list">
                  {preview.historicalData.transactions.slice(0, 10).map(transaction => (
                    <div key={transaction.id} className="transaction-item">
                      <div className="transaction-info">
                        <div className="transaction-type">
                          {transaction.type === 'lending' ? 'Initial Loan' : 'Interest'}
                        </div>
                        <div className="transaction-date">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                      <div className="transaction-amount">
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))}
                  {preview.historicalData.transactions.length > 10 && (
                    <div className="transaction-more">
                      ... and {preview.historicalData.transactions.length - 10} more transactions
                    </div>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowPreview(false)} className="btn-secondary">
                  Back to Edit
                </button>
                <button type="button" onClick={handleSubmit} className="btn-success">
                  Add Customer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoricalEntryForm;