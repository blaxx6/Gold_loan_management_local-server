import React, { useState, useEffect } from 'react';
import { calculateActualInterestEarned, calculateTotalPayments, formatCurrency } from '../utils/calculations';

const AdminPanel = ({ customers = [], onUpdateCustomer, onApplyInterestToAll, notifications = [], onClearNotifications }) => {
  const [analytics, setAnalytics] = useState({});
  const [exportData, setExportData] = useState([]);

  useEffect(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const activeCustomers = safeCustomers.filter(c => c.accountStatus === 'active');
    
    const totalCustomers = activeCustomers.length;
    const totalLentAmount = activeCustomers.reduce((sum, customer) => sum + (customer.lentAmount || 0), 0);
    const totalOutstandingBalance = activeCustomers.reduce((sum, customer) => sum + (customer.currentBalance || 0), 0);
    const totalInterestEarned = activeCustomers.reduce((sum, customer) => sum + calculateActualInterestEarned(customer), 0);
    const totalPayments = activeCustomers.reduce((sum, customer) => sum + calculateTotalPayments(customer), 0);
    // Use backend-provided monthlyInterest for analytics
    const totalMonthlyInterest = activeCustomers.reduce((sum, customer) => sum + (customer.monthlyInterest || 0), 0);
    const totalGoldWeight = activeCustomers.reduce((sum, customer) => sum + (customer.goldWeight || 0), 0);

    setAnalytics({
      totalCustomers,
      totalLentAmount,
      totalOutstandingBalance,
      totalInterestEarned,
      totalPayments,
      totalMonthlyInterest,
      totalGoldWeight,
      averageOutstanding: totalCustomers > 0 ? totalOutstandingBalance / totalCustomers : 0
    });
  }, [customers]);

  const handleApplyInterestToCustomer = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Use backend-provided monthlyInterest
    const interestAmount = customer.monthlyInterest || 0;
    const updatedCustomer = {
      ...customer,
      currentBalance: customer.currentBalance + interestAmount,
      lastInterestDate: new Date().toISOString(),
      newTransaction: {
        type: 'interest',
        amount: interestAmount,
        description: 'Monthly interest (1.5%) - Manual Application'
      }
    };

    onUpdateCustomer(updatedCustomer);
    alert(`Interest of ₹${interestAmount.toLocaleString()} applied to ${customer.name}`);
  };

  const generateInterestReport = () => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const report = safeCustomers.map(customer => ({
      name: customer.name,
      goldWeight: customer.goldWeight || 0,
      lentAmount: customer.lentAmount || 0,
      currentBalance: customer.currentBalance || 0,
      interestEarned: calculateActualInterestEarned(customer),
      totalPayments: calculateTotalPayments(customer),
      monthlyInterest: customer.monthlyInterest || 0,
      projectedBalance3M: customer.projectedBalance3M || 0,
      projectedBalance6M: customer.projectedBalance6M || 0,
      projectedBalance12M: customer.projectedBalance12M || 0
    }));
    setExportData(report);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-actions">
          <button onClick={onApplyInterestToAll} className="btn-primary">
            Apply Interest to All
          </button>
          <button onClick={generateInterestReport} className="btn-info">
            Generate Report
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h4>Total Customers</h4>
          <div className="analytics-number">{analytics.totalCustomers || 0}</div>
        </div>
        <div className="analytics-card">
          <h4>Total Lent Amount</h4>
          <div className="analytics-number">₹{(analytics.totalLentAmount || 0).toLocaleString()}</div>
        </div>
        <div className="analytics-card">
          <h4>Total Outstanding</h4>
          <div className="analytics-number">₹{(analytics.totalOutstandingBalance || 0).toLocaleString()}</div>
        </div>
        <div className="analytics-card">
          <h4>Total Interest Earned</h4>
          <div className="analytics-number">₹{(analytics.totalInterestEarned || 0).toLocaleString()}</div>
        </div>
        <div className="analytics-card">
          <h4>Total Payments</h4>
          <div className="analytics-number">₹{(analytics.totalPayments || 0).toLocaleString()}</div>
        </div>
        <div className="analytics-card">
          <h4>Monthly Interest</h4>
          <div className="analytics-number">₹{(analytics.totalMonthlyInterest || 0).toLocaleString()}</div>
        </div>
        <div className="analytics-card">
          <h4>Total Gold Weight</h4>
          <div className="analytics-number">{(analytics.totalGoldWeight || 0).toFixed(3)}g</div>
        </div>
        <div className="analytics-card">
          <h4>Average Outstanding</h4>
          <div className="analytics-number">₹{(analytics.averageOutstanding || 0).toLocaleString()}</div>
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>Recent Notifications</h3>
            <button onClick={onClearNotifications} className="btn-danger">
              Clear All
            </button>
          </div>
          <div className="notifications-list">
            {notifications.map(notification => (
              <div key={notification.id} className="notification-item">
                <span className="notification-message">{notification.message}</span>
                <span className="notification-time">
                  {new Date(notification.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="customer-management">
        <h3>Customer Management</h3>
        {customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="customer-card">
              <div className="customer-info">
                <h4>{customer.name}</h4>
                <p><strong>Gold Weight:</strong> {(customer.goldWeight || 0).toFixed(3)}g</p>
                <p><strong>Lent Amount:</strong> ₹{(customer.lentAmount || 0).toLocaleString()}</p>
                <p><strong>Current Balance:</strong> ₹{(customer.currentBalance || 0).toLocaleString()}</p>
                <p><strong>Interest Earned:</strong> ₹{calculateActualInterestEarned(customer).toLocaleString()}</p>
                <p><strong>Total Payments:</strong> ₹{calculateTotalPayments(customer).toLocaleString()}</p>
                {/* Use backend-provided monthlyInterest */}
                <p><strong>Monthly Interest:</strong> ₹{(customer.monthlyInterest || 0).toLocaleString()}</p>
                <p><strong>Last Interest:</strong> {customer.lastInterestDate ? new Date(customer.lastInterestDate).toLocaleDateString() : 'Never'}</p>
              </div>
              <div className="customer-actions">
                <button 
                  onClick={() => handleApplyInterestToCustomer(customer.id)}
                  className="btn-success"
                >
                  Apply Interest
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {exportData.length > 0 && (
        <div className="report-table">
          <h3>Interest Report & Projections</h3>
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Gold Weight</th>
                <th>Lent Amount</th>
                <th>Current Balance</th>
                <th>Interest Earned</th>
                <th>Total Payments</th>
                <th>Monthly Interest</th>
                <th>3M Projection</th>
                <th>6M Projection</th>
                <th>12M Projection</th>
              </tr>
            </thead>
            <tbody>
              {exportData.map(row => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.goldWeight.toFixed(3)}g</td>
                  <td>{formatCurrency(row.lentAmount)}</td>
                  <td>{formatCurrency(row.currentBalance)}</td>
                  <td>{formatCurrency(row.interestEarned)}</td>
                  <td>{formatCurrency(row.totalPayments)}</td>
                  <td>{formatCurrency(row.monthlyInterest)}</td>
                  <td>{formatCurrency(row.projectedBalance3M)}</td>
                  <td>{formatCurrency(row.projectedBalance6M)}</td>
                  <td>{formatCurrency(row.projectedBalance12M)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;