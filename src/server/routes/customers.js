const express = require('express');
const router = express.Router();
const db = require('../config/sqlite');
const upload = require('../middleware/upload');

// Get all customers with IST timestamps
router.get('/', (req, res) => {
    // The DATETIME function with '+5 hours' and '+30 minutes' converts the stored UTC time to IST.
    const query = `
        SELECT c.*, 
               DATETIME(c.createdAt, '+5 hours', '+30 minutes') as createdAtIST,
               DATETIME(c.lastInterestDate, '+5 hours', '+30 minutes') as lastInterestDateIST,
               COUNT(t.id) as transactionCount,
               COUNT(ail.id) as autoInterestCount
        FROM customers c
        LEFT JOIN transactions t ON c.id = t.customerId
        LEFT JOIN auto_interest_log ail ON c.id = ail.customerId
        WHERE c.accountStatus = 'active'
        GROUP BY c.id
        ORDER BY c.createdAt DESC
    `;
    
    db.getDatabase().all(query, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get customer by ID with transactions and IST timestamps
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    const customerQuery = `
        SELECT *,
               DATETIME(createdAt, '+5 hours', '+30 minutes') as createdAtIST,
               DATETIME(lastInterestDate, '+5 hours', '+30 minutes') as lastInterestDateIST
        FROM customers 
        WHERE id = ?
    `;
    db.getDatabase().get(customerQuery, [id], (err, customer) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!customer) {
            res.status(404).json({ error: 'Customer not found' });
        } else {
            // Also convert transaction dates to IST
            const transactionQuery = `
                SELECT *,
                       DATETIME(date, '+5 hours', '+30 minutes') as dateIST
                FROM transactions 
                WHERE customerId = ? 
                ORDER BY date DESC
            `;
            db.getDatabase().all(transactionQuery, [id], (err, transactions) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                } else {
                    customer.transactions = transactions;
                    res.json(customer);
                }
            });
        }
    });
});

// Add a new customer
// No changes needed here as it's inserting data, not retrieving it.
// The CURRENT_TIMESTAMP will still be stored as UTC, which is correct.
router.post('/', upload.array('goldImages', 10), (req, res) => {
    const { name, email, phone, address, idType, idNumber, goldWeight, goldRate, lentAmount, lentDate, interestRate } = req.body;
    const database = db.getDatabase();

    database.run('BEGIN TRANSACTION');

    const insertCustomerQuery = `
        INSERT INTO customers (name, email, phone, address, idType, idNumber, goldWeight, goldRate, lentAmount, lentDate, interestRate, currentBalance, accountStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    database.run(insertCustomerQuery, [name, email, phone, address, idType, idNumber, goldWeight, goldRate, lentAmount, lentDate, interestRate, lentAmount], function(err) {
        if (err) {
            database.run('ROLLBACK');
            res.status(500).json({ error: err.message });
            return;
        }

        const customerId = this.lastID;
        const insertTransactionQuery = `
            INSERT INTO transactions (customerId, type, amount, description) 
            VALUES (?, 'gold_loan', ?, ?)
        `;
        const description = `${goldWeight}g gold | @ ₹${goldRate}/g`;

        database.run(insertTransactionQuery, [customerId, lentAmount, description], (err) => {
            if (err) {
                database.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }

            // Handle image uploads if they exist
            if (req.files) {
                const insertImageQuery = 'INSERT INTO customer_images (customerId, imagePath, uploadDate) VALUES (?, ?, CURRENT_TIMESTAMP)';
                let imagesProcessed = 0;
                req.files.forEach(file => {
                    database.run(insertImageQuery, [customerId, file.path], (err) => {
                        imagesProcessed++;
                        if (err) {
                            database.run('ROLLBACK');
                            res.status(500).json({ error: `Image upload failed: ${err.message}` });
                            return; // Exit after sending response
                        }
                        if (imagesProcessed === req.files.length) {
                             // All images processed, commit transaction
                            database.run('COMMIT');
                            res.json({ message: 'Customer added successfully', customerId });
                        }
                    });
                });
            } else {
                // No files to process, commit transaction
                database.run('COMMIT');
                res.json({ message: 'Customer added successfully', customerId });
            }
        });
    });
});


// Delete a customer (backup logic)
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const database = db.getDatabase();

    database.serialize(() => {
        database.run('BEGIN TRANSACTION');

        const customerQuery = 'SELECT * FROM customers WHERE id = ?';
        database.get(customerQuery, [id], (err, customer) => {
            if (err) {
                database.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            if (!customer) {
                database.run('ROLLBACK');
                res.status(404).json({ error: 'Customer not found for deletion' });
                return;
            }

            // Fetch total interest paid from transactions
            const interestQuery = `SELECT SUM(amount) as totalInterest FROM transactions WHERE customerId = ? AND type = 'interest'`;
            database.get(interestQuery, [id], (err, result) => {
                    const totalInterestPaid = result ? result.totalInterest : 0;

                    const backupQuery = `
                        INSERT INTO deleted_customers (originalId, data, finalBalance, totalInterestPaid, deletedAt)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    `;
                    
                    database.run(backupQuery, [
                        id,
                        JSON.stringify(customer),
                        customer.currentBalance, // Changed from balance to currentBalance
                        totalInterestPaid
                    ], (err) => {
                        if (err) {
                            database.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        // Delete related records and then the customer
                        database.run('DELETE FROM customer_images WHERE customerId = ?', [id]);
                        database.run('DELETE FROM auto_interest_log WHERE customerId = ?', [id]);
                        database.run('DELETE FROM transactions WHERE customerId = ?', [id]);
                        database.run('DELETE FROM customers WHERE id = ?', [id], (err) => {
                            if (err) {
                                database.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                            } else {
                                database.run('COMMIT');
                                res.json({ message: 'Customer deleted successfully' });
                            }
                        });
                    });
                }
            );
        });
    });
});

module.exports = router;