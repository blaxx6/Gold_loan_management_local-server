import React, { useState } from 'react';
import {
  calculateMonthlyInterest,
  calculateActualInterestEarned,
  calculateTotalPayments
} from '../utils/calculations';

// Simple interest projection (not compounded)
function projectSimpleInterestBalance(currentBalance, lentAmount, months, monthlyRate = 1.5) {
  // Interest is always on principal (lentAmount), not on currentBalance
  const projectedInterest = lentAmount * (monthlyRate / 100) * months;
  return Math.round(currentBalance + projectedInterest);
}

const InterestCalculator = ({ customer, onPayment }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [calculationMonths, setCalculationMonths] = useState(1);

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (amount > 0 && amount <= customer.currentBalance) {
      onPayment(customer.id, amount);
      setPaymentAmount('');
    } else {
      alert('Please enter a valid payment amount');
    }
  };

  const monthlyInterest = calculateMonthlyInterest(customer.lentAmount);
  const interestEarned = calculateActualInterestEarned(customer);
  const totalPayments = calculateTotalPayments(customer);

  const projectedBalance = projectSimpleInterestBalance(
    customer.currentBalance,
    customer.lentAmount,
    calculationMonths,
    1.5
  );

  return (
    <div className="interest-calculator">
      <h4>Interest Calculator</h4>
      
      <div className="account-summary">
        <div className="summary-item">
          <strong>Original Lent Amount</strong>
          <span>₹{customer.lentAmount.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <strong>Current Outstanding</strong>
          <span>₹{customer.currentBalance.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <strong>Interest Earned</strong>
          <span>₹{interestEarned.toLocaleString()}</span>
        </div>
        <div className="summary-item">
          <strong>Total Payments</strong>
          <span>₹{totalPayments.toLocaleString()}</span>
        </div>
      </div>

      <div className="projections">
        <h5>Interest Projections</h5>
        <div className="projection-controls">
          <label>
            Calculate for:&nbsp;
            <input
              type="number"
              min="1"
              value={calculationMonths}
              onChange={(e) => setCalculationMonths(parseInt(e.target.value) || 1)}
              style={{ width: 60, marginRight: 4 }}
            />
            months
          </label>
        </div>
        
        <div className="projection-result">
          <strong>Current Balance:</strong> ₹{customer.currentBalance.toLocaleString()}
        </div>
        <div className="projection-result">
          <strong>Next Month Interest:</strong> ₹{monthlyInterest.toLocaleString()}
        </div>
        <div className="projection-result">
          <strong>Projected Balance ({calculationMonths} months):</strong> ₹{projectedBalance.toLocaleString()}
        </div>
      </div>

      <div className="payment-section">
        <h5>Record Payment</h5>
        <div className="payment-form">
          <input
            type="number"
            placeholder="Payment amount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            max={customer.currentBalance}
            min={1}
            style={{ marginRight: 8 }}
          />
          <button onClick={handlePayment} className="btn-success">
            Record Payment
          </button>
        </div>
        <p className="payment-note">
          Maximum payment: ₹{customer.currentBalance.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default InterestCalculator;