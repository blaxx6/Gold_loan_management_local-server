// Interest calculation utilities (DAILY INTEREST VERSION)

// Calculate daily interest (simple, not compounded)
export const calculateDailyInterest = (principal, date = new Date(), rate = 1.5) => {
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const dailyRate = rate / 100 / daysInMonth;
  return principal * dailyRate;
};

// Calculate monthly interest (simple, not compounded)
export const calculateMonthlyInterest = (balance, rate = 1.5) => {
  return balance * (rate / 100);
};

// Generate daily interest transactions between two dates (exclusive of end date)
export const generateDailyInterestTransactions = (lentAmount, lentDate, currentDate, rate = 1.5) => {
  const start = new Date(lentDate);
  const end = new Date(currentDate);
  let currentBalance = lentAmount;
  const transactions = [];

  // Add initial lending transaction
  transactions.push({
    id: Date.now(),
    type: 'lending',
    amount: lentAmount,
    description: 'Initial amount lent',
    date: start.toISOString(),
    balance: lentAmount
  });

  let transactionDate = new Date(start);
  transactionDate.setHours(0, 0, 0, 0);

  // Add daily interest for each day after lentDate up to but not including currentDate
  while (transactionDate < end) {
    // Skip the first day (lent date itself)
    if (transactionDate > start) {
      const interest = calculateDailyInterest(lentAmount, transactionDate, rate);
      currentBalance += interest;

      transactions.push({
        id: Date.now() + transactions.length,
        type: 'interest',
        amount: interest,
        date: transactionDate.toISOString(),
        description: `Daily interest (${rate}%/month)`,
        balance: currentBalance
      });
    }
    transactionDate.setDate(transactionDate.getDate() + 1);
  }

  return {
    transactions,
    finalBalance: currentBalance
  };
};

export const calculateActualInterestEarned = (customer) => {
  if (!customer.transactions || !Array.isArray(customer.transactions)) {
    return 0;
  }
  return customer.transactions
    .filter(transaction => transaction.type === 'interest')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
};

export const calculateTotalPayments = (customer) => {
  if (!customer.transactions || !Array.isArray(customer.transactions)) {
    return 0;
  }
  return customer.transactions
    .filter(transaction => transaction.type === 'payment')
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);
};

// Helper function to calculate days between two dates (exclusive of end date)
export const getDaysBetweenDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.setHours(0,0,0,0) - start.setHours(0,0,0,0);
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

// Check if customer is due for daily interest (i.e., lastInterestDate < today)
export const isCustomerDueForInterest = (lentDate, lastInterestDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastInterest = lastInterestDate ? new Date(lastInterestDate) : new Date(lentDate);
  lastInterest.setHours(0, 0, 0, 0);
  return lastInterest < today;
};

// Calculate next interest due date (always tomorrow if daily)
export const getNextInterestDueDate = (lentDate, lastInterestDate) => {
  const lastInterest = lastInterestDate ? new Date(lastInterestDate) : new Date(lentDate);
  lastInterest.setDate(lastInterest.getDate() + 1);
  return lastInterest;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};