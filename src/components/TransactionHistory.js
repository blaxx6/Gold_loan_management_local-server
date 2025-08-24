import React, { useState } from 'react';

const TransactionHistory = ({ transactions = [] }) => {
  const [sortBy, setSortBy] = useState('date');
  const [filterBy, setFilterBy] = useState('all');

  if (!transactions || !Array.isArray(transactions)) {
    return (
      <div className="transaction-history">
        <h3>Transaction History</h3>
        <p>No transactions available.</p>
      </div>
    );
  }

  const sortedAndFilteredTransactions = transactions
    .filter(transaction => {
      if (filterBy === 'all') return true;
      return transaction.type === filterBy;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date) - new Date(a.date);
      } else if (sortBy === 'amount') {
        return b.amount - a.amount;
      }
      return 0;
    });

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'gold_loan':
        return '#007aff';
      case 'payment':
        return '#30d158';
      case 'interest':
        return '#ff9500';
      default:
        return '#1d1d1f';
    }
  };

  const getTransactionTypeLabel = (type) => {
    const words = type.split('_');
    const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return capitalizedWords.join(' ');
  };

  const getTransactionAmountColor = (type) => {
    switch (type) {
      case 'gold_loan':
      case 'payment':
      case 'interest':
      default:
        return '#1d1d1f'; // Default neutral color
    }
  };

  const formatAmount = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return 'N/A';
    }
    return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="transaction-history">
      <div className="transaction-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Transaction History</h3>
        <div className="transaction-controls" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div className="form-group">
            <label htmlFor="sortBy" style={{ marginRight: 4 }}>Sort By:</label>
            <select id="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="filterBy" style={{ marginRight: 4 }}>Filter By:</label>
            <select id="filterBy" value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
              <option value="all">All</option>
              <option value="gold_loan">Gold Loans</option>
              <option value="payment">Payments</option>
              <option value="interest">Interest</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="transaction-list" style={{ marginTop: 16 }}>
        {sortedAndFilteredTransactions.length === 0 ? (
          <div className="no-transactions-message">
            <p>No transactions found.</p>
          </div>
        ) : (
          sortedAndFilteredTransactions.map(transaction => (
            <div
              key={transaction.id}
              className="transaction-item"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid #eee',
                gap: 12
              }}
            >
              <div className="transaction-info" style={{ flex: 1 }}>
                <div
                  className="transaction-type"
                  style={{ color: getTransactionTypeColor(transaction.type), fontWeight: 600, fontSize: 15 }}
                >
                  {getTransactionTypeLabel(transaction.type)}
                </div>
                <div className="transaction-description" style={{ color: '#555', fontSize: 13 }}>
                  {transaction.description}
                </div>
                <div className="transaction-date" style={{ color: '#888', fontSize: 12 }}>
                  {new Date(transaction.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
              <div
                className="transaction-amount"
                style={{
                  color: getTransactionAmountColor(transaction.type),
                  fontWeight: 700,
                  fontSize: 16,
                  minWidth: 120,
                  textAlign: 'right'
                }}
              >
                {formatAmount(transaction.amount)}
              </div>
            </div>
          ))
        )}
      </div>
      <style>{`
        .transaction-history {
          background: #343333ff;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(234, 226, 226, 0.04);
          padding: 20px;
          margin-bottom: 24px;
        }
        @media (max-width: 600px) {
          .transaction-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .transaction-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
          .transaction-amount {
            min-width: unset !important;
            text-align: left !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TransactionHistory;