import React, { useState } from 'react';

const CustomerForm = ({ onAddCustomer, onClose = () => {}, isHistorical = false }) => {
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
    targetAmount: '0',
    lentDate: '',
    interestRate: '1.5',
  });
  const [goldImages, setGoldImages] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPreview, setShowPreview] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
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

  // Historical Calculation Functions (DAILY SIMPLE INTEREST)
  const calculateInterestByLentDate = (lentAmount, lentDate, currentDate, rate) => {
    const start = new Date(lentDate);
    const end = new Date(currentDate);
    const transactions = [];

    let currentBalance = lentAmount;

    // Add initial lending transaction
    transactions.push({
      id: Math.random(),
      type: 'lending',
      amount: lentAmount,
      description: 'Initial amount lent (Historical)',
      date: start.toISOString(),
      balance: lentAmount
    });

    let current = new Date(start);
    // Add daily interest until (and including) end date
    while (current <= end) {
      // Calculate days in the current month
      const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
      // Calculate daily interest (simple interest, not compounding)
      const dailyInterest = (lentAmount * rate) / 100 / daysInMonth;

      currentBalance += dailyInterest;

      transactions.push({
        id: Math.random(),
        type: 'interest',
        amount: dailyInterest,
        description: `Daily interest (${rate}%/month) (Historical)`,
        date: current.toISOString(),
        balance: currentBalance
      });

      // Move to next day
      current.setDate(current.getDate() + 1);
    }

    return { transactions, finalBalance: currentBalance };
  };

  // Form Validation (slightly modified for historical)
  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.idType) newErrors.idType = 'ID type is required';
    if (!formData.idNumber.trim()) newErrors.idNumber = 'ID number is required';
    if (formData.goldWeight && parseFloat(formData.goldWeight) <= 0) newErrors.goldWeight = 'Gold weight must be greater than 0 (if entered)';
    if (!formData.lentAmount || parseFloat(formData.lentAmount) <= 0) newErrors.lentAmount = 'Lent amount must be greater than 0';
    if (isHistorical && !formData.lentDate) newErrors.lentDate = 'Lent date is required';
    if (isHistorical && Object.keys(newErrors).length === 0 && !showPreview) return false;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const isValid = validateForm();
    if (!isValid) return;
    if (isHistorical && !showPreview) {
      handlePreview();
      return;
    }

    let customerData = {};

    if (isHistorical && previewData) {
      customerData = {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        idType: formData.idType,
        idNumber: formData.idNumber || '',
        goldWeight: parseFloat(formData.goldWeight) || 0,
        goldRate: parseFloat(formData.goldRate) || 0,
        lentAmount: parseFloat(formData.lentAmount),
        targetAmount: parseFloat(formData.targetAmount),
        lentDate: formData.lentDate,
        lastInterestDate: previewData.currentDate,
        accountStatus: 'active',
        transactions: previewData.historicalData.transactions,
        goldImages: goldImages,
        currentBalance: previewData.historicalData.finalBalance,
      };
    } else {
      customerData = {
        ...formData,
        goldWeight: parseFloat(formData.goldWeight) || 0,
        goldRate: parseFloat(formData.goldRate) || 0,
        lentAmount: parseFloat(formData.lentAmount),
        targetAmount: parseFloat(formData.targetAmount),
        lentDate: new Date().toISOString().split('T')[0],
        lastInterestDate: null,
        accountStatus: 'active',
        transactions: [{
          id: Math.random(),
          type: 'lending',
          amount: parseFloat(formData.lentAmount),
          description: 'Initial amount lent',
          date: new Date().toISOString(),
          balance: parseFloat(formData.lentAmount),
        }],
        goldImages: goldImages,
        currentBalance: parseFloat(formData.lentAmount),
      };
      delete customerData.interestRate;
    }

    onAddCustomer(customerData);
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handlePreview = () => {
    setErrors({});
    if (!validateForm()) return;
    const lentAmount = parseFloat(formData.lentAmount);
    const lentDate = formData.lentDate;
    const currentDate = new Date().toISOString().split('T')[0];
    const interestRate = parseFloat(formData.interestRate);
    if (!lentAmount || !lentDate) return;
    const historicalData = calculateInterestByLentDate(lentAmount, lentDate, currentDate, interestRate);
    setPreviewData({ ...formData, historicalData, currentDate, totalInterest: historicalData.finalBalance - lentAmount });
    setShowPreview(true);
  };

  return (
    <div className="customer-form">
      <div className="form-header">
        <h2>{isHistorical ? 'Add Historical Customer' : 'Add New Customer'}</h2>
        {/*<button type="button" className="close-button" onClick={onClose}>
          &times;
        </button>*/}
      </div>
      <form onSubmit={handleSubmit} className="form-content">
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            className={errors.name ? 'error' : ''}
            required
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={errors.email ? 'error' : ''}
            required
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone *</label>
          <input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={errors.phone ? 'error' : ''}
            required
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="idType">ID Type *</label>
          <select
            id="idType"
            name="idType"
            value={formData.idType}
            onChange={handleInputChange}
            className={errors.idType ? 'error' : ''}
            required
          >
            <option value="aadhar">Aadhar Card</option>
            <option value="pan">PAN Card</option>
            <option value="driving_license">Driving License</option>
            <option value="voter_id">Voter ID</option>
            <option value="passport">Passport</option>
          </select>
          {errors.idType && <span className="error-message">{errors.idType}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="idNumber">ID Number *</label>
          <input
            id="idNumber"
            name="idNumber"
            value={formData.idNumber}
            onChange={handleInputChange}
            className={errors.idNumber ? 'error' : ''}
            required
          />
          {errors.idNumber && <span className="error-message">{errors.idNumber}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="goldWeight">Gold Weight (grams) *</label>
          <input
            id="goldWeight"
            name="goldWeight"
            type="number"
            value={formData.goldWeight}
            onChange={handleInputChange}
            className={errors.goldWeight ? 'error' : ''}
            step="0.001"
            min="0"
            required
          />
          {errors.goldWeight && <span className="error-message">{errors.goldWeight}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="goldRate">Gold Rate (₹/gram)</label>
          <input
            id="goldRate"
            name="goldRate"
            type="number"
            value={formData.goldRate}
            onChange={handleInputChange}
            min="0"
          />
        </div>

        <div className="form-group">
          <label htmlFor="lentAmount">Lent Amount (₹) *</label>
          <input
            id="lentAmount"
            name="lentAmount"
            type="number"
            value={formData.lentAmount}
            onChange={handleInputChange}
            className={errors.lentAmount ? 'error' : ''}
            min="0"
            required
          />
          {errors.lentAmount && <span className="error-message">{errors.lentAmount}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="lentDate">Lent Date {isHistorical && '*'}</label>
          <input
            id="lentDate"
            name="lentDate"
            type="date"
            value={formData.lentDate}
            onChange={handleInputChange}
            className={errors.lentDate ? 'error' : ''}
            max={new Date().toISOString().split('T')[0]}
            required={isHistorical}
          />
          {errors.lentDate && <span className="error-message">{errors.lentDate}</span>}
        </div>

        {isHistorical && (
          <div className="form-group">
            <label htmlFor="interestRate">Interest Rate (% per month)</label>
            <input
              id="interestRate"
              name="interestRate"
              value={formData.interestRate}
              onChange={handleInputChange}
              step="0.1"
            />
          </div>
        )}

        <div className="form-group">
          <label>Target Amount (₹)</label>
          <input
            name="targetAmount"
            type="number"
            value={formData.targetAmount}
            onChange={handleInputChange}
            min="0"
          />
        </div>

        <div className="form-group">
          <label>Gold Images</label>
          <input
            className="file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
          />
          {goldImages.length > 0 && (
            <div className="uploaded-images">
              {goldImages.map(image => (
                <div key={image.id} className="image-preview">
                  <img
                    src={image.data}
                    alt={image.name}
                    className="preview-image"
                  />
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={() => removeImage(image.id)}
                  >
                    ×
                  </button>
                  <p>{image.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {isHistorical && showPreview && previewData && (
          <div className="preview-section">
            <h3>Historical Calculation Preview</h3>
            <div className="preview-summary">
              <div className="summary-item">
                <span>Lent Amount:</span> <strong>{previewData.lentAmount}</strong>
              </div>
              <div className="summary-item">
                <span>Lent Date:</span> <strong>{previewData.lentDate}</strong>
              </div>
              <div className="summary-item">
                <span>Calculated Current Balance:</span> <strong>{previewData.historicalData.finalBalance.toFixed(2)}</strong>
              </div>
              <div className="summary-item">
                <span>Total Interest Accrued:</span> <strong>{(previewData.historicalData.finalBalance - previewData.lentAmount).toFixed(2)}</strong>
              </div>
            </div>
            <h4>Generated Transactions ({previewData.historicalData.transactions.length})</h4>
            <div className="transaction-list">
              {previewData.historicalData.transactions.map(transaction => (
                <div key={transaction.id} className="transaction-item">
                  <div className="transaction-info">
                    <span className={`transaction-type transaction-type-${transaction.type}`}>{transaction.type}</span>
                    <span className="transaction-date">{new Date(transaction.date).toLocaleDateString()}</span>
                  </div>
                  <span className="transaction-amount">{transaction.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          {isHistorical && !showPreview ? (
            <button type="button" onClick={handlePreview} className="btn-primary">
              Preview Historical Data
            </button>
          ) : (
            <button type="submit" className="btn-primary">
              Confirm Add Historical Customer
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;