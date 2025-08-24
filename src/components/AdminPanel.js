import React, { useState, useEffect } from 'react';
import { calculateActualInterestEarned, calculateTotalPayments } from '../utils/calculations';

// --- NEW HELPER FUNCTION TO DOWNLOAD CSV ---
const downloadCSV = (data, filename = 'report.csv') => {
  if (!data || data.length === 0) {
    console.error("No data available to download.");
    return;
  }

  // Define CSV headers from the keys of the first object
  const headers = Object.keys(data[0]);
  // Convert array of objects to a CSV string
  const csvContent = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(fieldName => {
        // Handle values that might contain commas by enclosing them in quotes
        const value = row[fieldName];
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob from the CSV string
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a link element and trigger the download
  const link = document.createElement("a");
  if (link.download !== undefined) { // Check for browser support
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};


const AdminPanel = ({ customers = [], onUpdateCustomer, onApplyInterestToAll, notifications = [], onClearNotifications }) => {
  const [analytics, setAnalytics] = useState({});
  // No need for exportData state anymore, we'll generate and download directly
  // const [exportData, setExportData] = useState([]); 

  useEffect(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    const activeCustomers = safeCustomers.filter(c => c.accountStatus === 'active');
    
    const totalCustomers = activeCustomers.length;
    const totalLentAmount = activeCustomers.reduce((sum, customer) => sum + (customer.lentAmount || 0), 0);
    const totalOutstandingBalance = activeCustomers.reduce((sum, customer) => sum + (customer.currentBalance || 0), 0);
    const totalInterestEarned = activeCustomers.reduce((sum, customer) => sum + calculateActualInterestEarned(customer), 0);
    const totalPayments = activeCustomers.reduce((sum, customer) => sum + calculateTotalPayments(customer), 0);
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

    const interestAmount = customer.monthlyInterest || 0;
    const updatedCustomer = {
      ...customer,
      currentBalance: customer.currentBalance + interestAmount,
      lastInterestDate: new Date().toISOString(),
      newTransaction: {
        type: 'interest',
        amount: interestAmount,
        description: 'Monthly interest - Manual Application'
      }
    };

    onUpdateCustomer(updatedCustomer);
  };

  // --- MODIFIED FUNCTION TO GENERATE AND DOWNLOAD THE REPORT ---
  const generateInterestReport = () => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    if (safeCustomers.length === 0) {
        alert("No customer data available to generate a report.");
        return;
    }

    const reportData = safeCustomers.map(customer => ({
      CustomerName: customer.name,
      GoldWeight_g: (customer.goldWeight || 0).toFixed(3),
      LentAmount_INR: customer.lentAmount || 0,
      CurrentBalance_INR: customer.currentBalance || 0,
      InterestEarned_INR: calculateActualInterestEarned(customer),
      TotalPayments_INR: calculateTotalPayments(customer),
      MonthlyInterest_INR: customer.monthlyInterest || 0,
      ProjectedBalance_3M_INR: customer.projectedBalance3M || 0,
      ProjectedBalance_6M_INR: customer.projectedBalance6M || 0,
      ProjectedBalance_12M_INR: customer.projectedBalance12M || 0
    }));

    // Generate a filename with the current date
    const date = new Date().toISOString().split('T')[0];
    const filename = `Interest_Report_${date}.csv`;

    // Call the download function
    downloadCSV(reportData, filename);
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-actions">
          <button onClick={onApplyInterestToAll} className="action-button primary">
            Apply Interest to All
          </button>
          <button onClick={generateInterestReport} className="action-button secondary">
            Generate & Download Report
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Analytics cards remain the same */}
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
        <div className="notifications-panel card">
          <div className="notifications-header">
            <h3>Recent Notifications</h3>
            <button onClick={onClearNotifications} className="action-button danger">
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

      <div className="customer-management card">
        <h3>Customer Management</h3>
        {customers.length === 0 ? (
          <p>No customers found.</p>
        ) : (
          customers.map(customer => (
            <div key={customer.id} className="customer-management-item">
              <div className="customer-info">
                <h4>{customer.name}</h4>
                <p><strong>Balance:</strong> ₹{(customer.currentBalance || 0).toLocaleString()}</p>
                <p><strong>Monthly Interest:</strong> ₹{(customer.monthlyInterest || 0).toLocaleString()}</p>
              </div>
              <div className="customer-actions">
                <button 
                  onClick={() => handleApplyInterestToCustomer(customer.id)}
                  className="action-button"
                >
                  Apply Interest
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* The table display is no longer needed since the data is downloaded */}
    </div>
  );
};

export default AdminPanel;
