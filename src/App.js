import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CustomerForm from './components/CustomerForm';
import AdminPanel from './components/AdminPanel';
import { customerAPI } from './services/api';
import './App.css';

function App() {
  const [customers, setCustomers] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageDisplaySize, setImageDisplaySize] = useState('medium');

  useEffect(() => {
    loadCustomers();
    loadNotifications();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const customersData = await customerAPI.getAllCustomers();
      setCustomers(customersData);
      setError(null);
    } catch (err) {
      setError('Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const notificationsData = await customerAPI.getNotifications();
      setNotifications(notificationsData);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const addCustomer = async (customerData) => {
    try {
      await customerAPI.addCustomer(customerData);
      await loadCustomers();
      await loadNotifications();
      setCurrentView('dashboard');
    } catch (err) {
      alert('Error adding customer: ' + err.message);
    }
  };

  const updateCustomer = async (updatedCustomer) => {
    try {
      await customerAPI.updateCustomer(updatedCustomer.id, {
        currentBalance: updatedCustomer.currentBalance,
        lastInterestDate: updatedCustomer.lastInterestDate
      });

      if (updatedCustomer.newTransaction) {
        await customerAPI.addTransaction(updatedCustomer.id, updatedCustomer.newTransaction);
      }

      await loadCustomers();
      await loadNotifications();
    } catch (err) {
      alert('Error updating customer: ' + err.message);
    }
  };

  const deleteCustomer = async (customerId) => {
    try {
      await customerAPI.deleteCustomer(customerId);
      await loadCustomers();
      await loadNotifications();
      return true;
    } catch (err) {
      alert('Error deleting customer: ' + err.message);
      return false;
    }
  };

  const applyInterestToAll = async () => {
    try {
      await customerAPI.applyInterestToAll();
      await loadCustomers();
      await loadNotifications();
    } catch (err) {
      alert('Error applying interest: ' + err.message);
    }
  };

  const clearNotifications = async () => {
    try {
      await customerAPI.clearNotifications();
      setNotifications([]);
    } catch (err) {
      alert('Error clearing notifications: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading customer data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <h1>Gold Loan Management</h1>
        <div className="nav-buttons">
          <button 
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={currentView === 'add-customer' ? 'active' : ''}
            onClick={() => setCurrentView('add-customer')}
          >
            Add Customer
          </button>
          <button 
            className={currentView === 'admin' ? 'active' : ''}
            onClick={() => setCurrentView('admin')}
          >
            Admin Panel
            {notifications.length > 0 && (
              <span className="notification-badge">{notifications.length}</span>
            )}
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && (
          <Dashboard 
            customers={customers}
            onUpdateCustomer={updateCustomer}
            onDeleteCustomer={deleteCustomer}
            onRefresh={loadCustomers}
            onAddCustomer={addCustomer}
            imageDisplaySize={imageDisplaySize}
            onImageSizeChange={setImageDisplaySize}
          />
        )}
        
        {currentView === 'add-customer' && (
          <CustomerForm onAddCustomer={addCustomer} />
        )}
        
        {currentView === 'admin' && (
          <AdminPanel 
            customers={customers}
            onUpdateCustomer={updateCustomer}
            onApplyInterestToAll={applyInterestToAll}
            notifications={notifications}
            onClearNotifications={clearNotifications}
          />
        )}
      </main>
    </div>
  );
}

export default App;
