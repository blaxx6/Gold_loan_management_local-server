const cron = require('node-cron');
const db = require('../config/sqlite');

class InterestService {
    constructor() {
        this.startAutoInterestScheduler();
    }

    // Centralized interest calculation method
    calculateDailyInterest(balance, date = new Date()) {
        const numberOfDaysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
        return (balance * 0.015) / numberOfDaysInMonth;
    }

    // Schedule automatic interest calculation daily at midnight
    startAutoInterestScheduler() {
        cron.schedule('0 0 * * *', async () => {
            console.log('Starting daily automatic interest calculation...\n');
            await this.applyMonthlyInterestToAllCustomers();
        });

        // Remove or comment out the testing cron schedule ('*/5 * * * *') in production
    }

    async applyMonthlyInterestToAllCustomers() {
        const database = db.getDatabase();
        
        return new Promise((resolve, reject) => {
            database.serialize(() => {
                database.run('BEGIN TRANSACTION');
                
                // Get all active customers who haven't received interest today
                const query = `
                    SELECT id, name, balance, goldWeight, targetAmount, lastAutoInterestDate
                    FROM customers 
                    WHERE accountStatus = 'active' 
                    AND autoInterestEnabled = 1 
                    AND (lastAutoInterestDate IS NULL OR lastAutoInterestDate < date('now'))
                    AND balance > 0
                `;
                
                database.all(query, [], (err, customers) => {
                    if (err) {
                        database.run('ROLLBACK');
                        reject(err);
                        return;
                    }
                    
                    let processedCount = 0;
                    let totalCustomers = customers.length;
                    
                    if (totalCustomers === 0) {
                        database.run('COMMIT');
                        resolve(0);
                        return;
                    }
                    
                    const today = new Date();
                    customers.forEach((customer) => {
                        // Use centralized calculation
                        const interestAmount = this.calculateDailyInterest(customer.balance, today);
                        const newBalance = customer.balance + interestAmount;
                        
                        // Update customer balance and last interest date
                        const updateQuery = `
                            UPDATE customers 
                            SET balance = ?, lastAutoInterestDate = date('now')
                            WHERE id = ?
                        `;
                        
                        database.run(updateQuery, [newBalance, customer.id], (err) => {
                            if (err) {
                                database.run('ROLLBACK');
                                reject(err);
                                return;
                            }
                            
                            // Insert transaction record
                            const transactionQuery = `
                                INSERT INTO transactions (customerId, type, amount, description)
                                VALUES (?, 'interest', ?, 'Automatic daily interest (1.5% monthly rate)')
                            `;
                            
                            database.run(transactionQuery, [customer.id, interestAmount], (err) => {
                                if (err) {
                                    database.run('ROLLBACK');
                                    reject(err);
                                    return;
                                }
                                
                                // Log interest application
                                const logQuery = `
                                    INSERT INTO auto_interest_log (customerId, interestAmount, appliedDate, balanceBeforeInterest, balanceAfterInterest)
                                    VALUES (?, ?, date('now'), ?, ?)
                                `;
                                
                                database.run(logQuery, [customer.id, interestAmount, customer.balance, newBalance], (err) => {
                                    if (err) {
                                        database.run('ROLLBACK');
                                        reject(err);
                                        return;
                                    }
                                    
                                    processedCount++;
                                    
                                    // Check if target amount is reached and remove customer
                                    if (customer.targetAmount > 0 && newBalance >= customer.targetAmount) {
                                        this.removeCustomerOnTargetReached(customer.id, newBalance);
                                    }
                                    
                                    if (processedCount === totalCustomers) {
                                        database.run('COMMIT');
                                        console.log(`Automatic daily interest applied to ${processedCount} customers`);
                                        resolve(processedCount);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    removeCustomerOnTargetReached(customerId, finalBalance) {
        const database = db.getDatabase();
        
        database.serialize(() => {
            // Get customer data for backup
            database.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
                if (err || !customer) return;
                
                // Calculate total interest paid
                database.get(
                    'SELECT SUM(amount) as totalInterestPaid FROM transactions WHERE customerId = ? AND type = "interest"',
                    [customerId],
                    (err, result) => {
                        const totalInterestPaid = result?.totalInterestPaid || 0;
                        
                        // Create backup record
                        const backupQuery = `
                            INSERT INTO deleted_customers (originalCustomerId, customerData, deletionReason, finalBalance, totalInterestPaid)
                            VALUES (?, ?, 'Target amount reached', ?, ?)
                        `;
                        
                        database.run(backupQuery, [
                            customerId,
                            JSON.stringify(customer),
                            finalBalance,
                            totalInterestPaid
                        ], (err) => {
                            if (err) return;
                            
                            // Delete customer and related data
                            database.run('DELETE FROM customer_images WHERE customerId = ?', [customerId]);
                            database.run('DELETE FROM auto_interest_log WHERE customerId = ?', [customerId]);
                            database.run('DELETE FROM transactions WHERE customerId = ?', [customerId]);
                            database.run('DELETE FROM customers WHERE id = ?', [customerId]);
                            
                            console.log(`Customer ${customer.name} (ID: ${customerId}) removed - target amount reached`);
                        });
                    }
                );
            });
        });
    }

    async triggerManualInterestCalculation() {
        return await this.applyMonthlyInterestToAllCustomers();
    }
}

module.exports = new InterestService();