// Dynamic API base URL for IP address hosting
const getBaseURL = () => {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = '3001'; // Your server port
    
    // If accessing via IP address, use the same IP for API calls
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:${port}/api`;
    }
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3001/api';
};

const BASE_URL = getBaseURL();

const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

export const customerAPI = {
  // Get all customers
  getAllCustomers: () => apiCall('/customers'),

  // Add new customer
  addCustomer: (customerData) => apiCall('/customers', {
    method: 'POST',
    body: JSON.stringify(customerData),
  }),

  // Update customer
  updateCustomer: (id, customerData) => apiCall(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customerData),
  }),

  // Delete customer
  deleteCustomer: (id) => apiCall(`/customers/${id}`, {
    method: 'DELETE',
  }),

  // Add transaction
  addTransaction: (customerId, transactionData) => apiCall(`/customers/${customerId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(transactionData),
  }),

  // Apply interest to all customers
  applyInterestToAll: () => apiCall('/customers/apply-interest', {
    method: 'POST',
  }),

  // Get notifications
  getNotifications: () => apiCall('/notifications'),

  // Clear notifications
  clearNotifications: () => apiCall('/notifications', {
    method: 'DELETE',
  }),

  // Upload additional images
  uploadImages: async (customerId, files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch(`${BASE_URL}/customers/${customerId}/images`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },

  // Get image by ID
  getImageUrl: (imageId) => `${BASE_URL}/images/${imageId}`,
  
  // Health check endpoint
  healthCheck: () => apiCall('/'),
};

export default customerAPI;
