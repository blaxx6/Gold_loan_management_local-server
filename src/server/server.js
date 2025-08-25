const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

function getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
}

const LOCAL_IP = getLocalIPAddress();

app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        `http://${LOCAL_IP}:3000`,
        `http://${LOCAL_IP}:3001`,
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:(3000|3001)$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:(3000|3001)$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}:(3000|3001)$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const db = new sqlite3.Database('./financial_app.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run('PRAGMA foreign_keys = ON');
    db.run(`
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            address TEXT,
            id_type TEXT NOT NULL,
            id_number TEXT NOT NULL,
            gold_weight REAL NOT NULL,
            gold_rate REAL DEFAULT 0,
            lent_amount REAL NOT NULL,
            current_balance REAL NOT NULL,
            target_amount REAL DEFAULT 0,
            auto_interest_enabled INTEGER DEFAULT 1,
            account_status TEXT DEFAULT 'active',
            last_interest_date TEXT,
            lent_date TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS gold_images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            image_name TEXT NOT NULL,
            image_data BLOB NOT NULL,
            image_size INTEGER NOT NULL,
            image_type TEXT NOT NULL,
            upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            transaction_date TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT NOT NULL,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            is_read INTEGER DEFAULT 0
        )
    `);
    console.log('Database tables initialized');
}

function isCustomerDueForInterest(lentDate, lastInterestDate) {
    const lentDateObj = new Date(lentDate);
    const lastInterestDateObj = lastInterestDate ? new Date(lastInterestDate) : lentDateObj;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastInterestDateOnly = lastInterestDate ? new Date(lastInterestDate) : new Date(0);
    lastInterestDateOnly.setHours(0, 0, 0, 0);
    return lastInterestDateOnly < today;
}

function applyInterestToCustomer(customerId, currentBalance, customerName) {
    db.get('SELECT lent_amount FROM customers WHERE id = ?', [customerId], (err, row) => {
        if (err || !row) {
            console.error('Error getting customer lent amount for interest:', err);
            return;
        }
        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const monthlyInterestRate = 0.015;
        const dailyInterestRate = monthlyInterestRate / daysInMonth;
        
        const interestAmount = parseFloat((row.lent_amount * dailyInterestRate).toFixed(2));
        const newBalance = parseFloat((currentBalance + interestAmount).toFixed(2));

        db.run('UPDATE customers SET current_balance = ?, last_interest_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newBalance, today.toISOString(), customerId], (err) => {
            if (err) return console.error('Error updating customer balance:', err);
            db.run('INSERT INTO transactions (customer_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)', [customerId, 'interest', interestAmount, `Daily interest (1.5%/month) applied`], err => {
                if (err) console.error('Error adding interest transaction:', err);
                else console.log(`Interest applied to ${customerName}: ₹${interestAmount.toFixed(2)}`);
            });
        });
    });
}

function startAutomaticInterestScheduler() {
    cron.schedule('0 1 * * *', async () => {
        console.log('Checking for customers due for interest calculation...');
        db.all(`
            SELECT id, name, current_balance, lent_date, last_interest_date, lent_amount
            FROM customers
            WHERE account_status = 'active' AND auto_interest_enabled = 1 AND current_balance > 0
        `, [], (err, customers) => {
            if (err) {
                console.error('Error fetching customers:', err);
                return;
            }
            let processedCount = 0;
            customers.forEach(customer => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const lastInterestDateOnly = customer.last_interest_date ? new Date(customer.last_interest_date) : new Date(customer.lent_date);
                lastInterestDateOnly.setHours(0, 0, 0, 0);
                if (lastInterestDateOnly < today) {
                    applyInterestToCustomer(customer.id, customer.current_balance, customer.name);
                    processedCount++;
                }
            });
            if (processedCount > 0) {
                addNotification(`Interest applied to ${processedCount} customers based on their lent date anniversary`);
            }
        });
    });
    console.log('Automatic interest scheduler started - checking daily for customers due for interest');
}

function base64ToBuffer(base64String) {
    try {
        const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
    } catch (error) {
        console.error('Error converting base64 to buffer:', error);
        return Buffer.from('');
    }
}

function bufferToBase64(buffer, mimeType) {
    try {
        return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error('Error converting buffer to base64:', error);
        return '';
    }
}

function addNotification(message) {
    db.run('INSERT INTO notifications (message) VALUES (?)', [message], function(err) {
        if (err) {
            console.error('Error adding notification:', err.message);
        }
    });
}

app.get('/', (req, res) => {
    res.json({
        message: 'Financial App API Server (API Only Mode)',
        status: 'running',
        mode: 'api-only',
        networkAccess: {
            localIP: LOCAL_IP,
            port: PORT,
            accessUrls: [
                `http://localhost:${PORT}`,
                `http://127.0.0.1:${PORT}`,
                `http://${LOCAL_IP}:${PORT}`
            ]
        },
        endpoints: [
            'GET /api/customers',
            'POST /api/customers',
            'PUT /api/customers/:id',
            'DELETE /api/customers/:id',
            'POST /api/customers/:id/transactions',
            'POST /api/customers/apply-interest',
            'GET /api/notifications',
            'DELETE /api/notifications'
        ]
    });
});

app.get('/api/customers', (req, res) => {
    const customersQuery = 'SELECT * FROM customers ORDER BY created_at DESC';
    db.all(customersQuery, [], (err, customers) => {
        if (err) {
            console.error('Error fetching customers:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        const customerPromises = customers.map(customer => {
            return new Promise((resolve, reject) => {
                const imagesQuery = `
                    SELECT id, image_name, image_data, image_size, image_type, upload_date
                    FROM gold_images
                    WHERE customer_id = ?
                `;
                db.all(imagesQuery, [customer.id], (err, images) => {
                    if (err) {
                        console.error('Error fetching images for customer:', customer.id, err);
                        reject(err);
                        return;
                    }
                    const goldImages = images.map(img => ({
                        id: img.id,
                        name: img.image_name,
                        data: bufferToBase64(img.image_data, img.image_type),
                        size: img.image_size,
                        type: img.image_type,
                        uploadDate: img.upload_date
                    }));
                    const transactionsQuery = `
                        SELECT id, transaction_type as type, amount, description, transaction_date as date
                        FROM transactions
                        WHERE customer_id = ?
                        ORDER BY transaction_date DESC
                    `;
                    db.all(transactionsQuery, [customer.id], (err, transactions) => {
                        if (err) {
                            console.error('Error fetching transactions for customer:', customer.id, err);
                            reject(err);
                            return;
                        }
                        const customerData = {
                            id: customer.id,
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                            address: customer.address,
                            idType: customer.id_type,
                            idNumber: customer.id_number,
                            goldWeight: customer.gold_weight,
                            goldRate: customer.gold_rate,
                            lentAmount: customer.lent_amount,
                            currentBalance: customer.current_balance,
                            targetAmount: customer.target_amount,
                            autoInterestEnabled: customer.auto_interest_enabled,
                            accountStatus: customer.account_status,
                            lastInterestDate: customer.last_interest_date,
                            lentDate: customer.lent_date,
                            createdAt: customer.created_at,
                            updatedAt: customer.updated_at,
                            goldImages: goldImages,
                            transactions: transactions
                        };
                        resolve(customerData);
                    });
                });
            });
        });
        Promise.all(customerPromises)
            .then(customersData => {
                res.json(customersData);
            })
            .catch(err => {
                console.error('Error processing customers data:', err);
                res.status(500).json({ error: err.message });
            });
    });
});

app.post('/api/customers', (req, res) => {
    const {
        name, email, phone, address, idType, idNumber,
        goldWeight, goldRate, lentAmount, targetAmount, goldImages,
        lentDate, transactions, lastInterestDate, currentBalance
    } = req.body;

    const finalCurrentBalance = currentBalance || parseFloat(lentAmount);
    const actualLentDate = lentDate || new Date().toISOString().split('T')[0];

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        db.run(
            `INSERT INTO customers (
                name, email, phone, address, id_type, id_number,
                gold_weight, gold_rate, lent_amount, current_balance, target_amount, lent_date, last_interest_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, email, phone, address || '', idType, idNumber, goldWeight, goldRate || 0, lentAmount, finalCurrentBalance, targetAmount || 0, actualLentDate, lastInterestDate || null],
            function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: err.message });
                }
                const customerId = this.lastID;

                if (goldImages && goldImages.length > 0) {
                    let imagePromises = goldImages.map(image => {
                        return new Promise((resolve, reject) => {
                            try {
                                const imageBuffer = base64ToBuffer(image.data);
                                db.run(
                                    'INSERT INTO gold_images (customer_id, image_name, image_data, image_size, image_type) VALUES (?, ?, ?, ?, ?)',
                                    [customerId, image.name, imageBuffer, image.size, image.type],
                                    (err) => err ? reject(err) : resolve()
                                );
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });

                    Promise.all(imagePromises)
                        .then(() => insertTransactions(customerId, transactions || []))
                        .catch(err => {
                            db.run('ROLLBACK');
                            res.status(500).json({ error: err.message });
                        });
                } else {
                    insertTransactions(customerId, transactions || []);
                }

                function insertTransactions(customerId, transactionList) {
                    if (transactionList && transactionList.length > 0) {
                        let transactionPromises = transactionList.map(transaction => {
                            return new Promise((resolve, reject) => {
                                db.run(
                                    'INSERT INTO transactions (customer_id, transaction_type, amount, description, transaction_date) VALUES (?, ?, ?, ?, ?)',
                                    [customerId, transaction.type, transaction.amount, transaction.description, transaction.date],
                                    (err) => err ? reject(err) : resolve()
                                );
                            });
                        });

                        Promise.all(transactionPromises)
                            .then(finalizeCustomerAddition)
                            .catch(err => {
                                db.run('ROLLBACK');
                                res.status(500).json({ error: err.message });
                            });
                    } else {
                        db.run(
                            'INSERT INTO transactions (customer_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
                            [customerId, 'gold_loan', lentAmount, `Money lent against ${goldWeight}g gold @ ₹${goldRate || 0}/g`],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return res.status(500).json({ error: err.message });
                                }
                                finalizeCustomerAddition();
                            }
                        );
                    }
                }

                function finalizeCustomerAddition() {
                    db.run('COMMIT', (err) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                        } else {
                            addNotification(`New customer ${name} added - ₹${lentAmount.toLocaleString()} lent against ${goldWeight}g gold`);
                            res.json({ id: customerId, message: 'Customer added successfully' });
                        }
                    });
                }
            }
        );
    });
});

// ========================= THE DEFINITIVE FIX =========================
// This route now cleans ALL incoming balance updates, solving the problem at the source.
app.put('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;
    let { currentBalance, lastInterestDate } = req.body;

    // First, validate that currentBalance is a number
    let balance = parseFloat(currentBalance);
    if (isNaN(balance)) {
        return res.status(400).json({ error: 'Invalid currentBalance provided.' });
    }

    const EPSILON = 0.01; // Our threshold for "zero"

    // Check if the balance is negligibly close to zero
    if (Math.abs(balance) < EPSILON) {
        balance = 0; // Force it to be exactly 0
    } else {
        // If it's not close to zero, round it to 2 decimal places anyway
        balance = parseFloat(balance.toFixed(2));
    }

    console.log(`Updating customer ${customerId}: Cleaned Balance = ${balance}`);

    db.run(
        'UPDATE customers SET current_balance = ?, last_interest_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [balance, lastInterestDate, customerId],
        function(err) {
            if (err) {
                console.error('Error updating customer:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Customer updated successfully' });
        }
    );
});
// ========================== END OF FIX ==========================

app.post('/api/customers/:id/transactions', (req, res) => {
    const customerId = req.params.id;
    const { type, amount, description } = req.body;

    db.run(
        'INSERT INTO transactions (customer_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
        [customerId, type, amount, description],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Transaction added successfully' });
        }
    );
});

app.delete('/api/customers/:id', (req, res) => {
    const customerId = req.params.id;

    db.get('SELECT current_balance FROM customers WHERE id = ?', [customerId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Customer not found' });
            
        const balanceThreshold = 0.01;
        if (Math.abs(row.current_balance) > balanceThreshold) {
            return res.status(400).json({
                error: `Cannot delete customer with outstanding balance: ₹${row.current_balance.toFixed(2)}`
            });
        }
        db.run('DELETE FROM customers WHERE id = ?', [customerId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            addNotification(`Customer account deleted (Final balance: ₹${row.current_balance.toFixed(2)})`);
            res.json({ message: 'Customer deleted successfully' });
        });
    });
});

app.post('/api/customers/apply-interest', (req, res) => {
    const currentDate = new Date();
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const dailyInterestRate = 0.015 / daysInMonth;

    db.all(
        'SELECT id, name, current_balance, lent_date, last_interest_date FROM customers WHERE account_status = "active" AND current_balance > 0',
        [],
        (err, customers) => {
            if (err) return res.status(500).json({ error: err.message });

            const eligibleCustomers = customers.filter(customer =>
                isCustomerDueForInterest(customer.lent_date, customer.last_interest_date)
            );

            const updatePromises = eligibleCustomers.map(customer => {
                return new Promise((resolve, reject) => {
                    db.get('SELECT lent_amount FROM customers WHERE id = ?', [customer.id], (err, row) => {
                        if (err || !row) return reject(err);

                        const interestAmount = parseFloat((row.lent_amount * dailyInterestRate).toFixed(2));
                        const newBalance = parseFloat((customer.current_balance + interestAmount).toFixed(2));

                        db.run(
                            'UPDATE customers SET current_balance = ?, last_interest_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [newBalance, currentDate.toISOString(), customer.id],
                            (err) => {
                                if (err) return reject(err);
                                db.run(
                                    'INSERT INTO transactions (customer_id, transaction_type, amount, description) VALUES (?, ?, ?, ?)',
                                    [customer.id, 'interest', interestAmount, `Daily interest (1.5%/month) applied`],
                                    (err) => err ? reject(err) : resolve()
                                );
                            }
                        );
                    });
                });
            });

            Promise.all(updatePromises)
                .then(() => {
                    addNotification(`Interest applied to ${eligibleCustomers.length} customers (daily)`);
                    res.json({ message: `Interest applied to ${eligibleCustomers.length} customers (daily)` });
                })
                .catch(err => {
                    res.status(500).json({ error: err.message });
                });
        }
    );
});

app.get('/api/notifications', (req, res) => {
    db.all('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const notifications = rows.map(row => ({
            id: row.id,
            message: row.message,
            timestamp: row.timestamp,
            read: row.is_read === 1
        }));
        res.json(notifications);
    });
});

app.delete('/api/notifications', (req, res) => {
    db.run('DELETE FROM notifications', [], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Notifications cleared' });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Financial App API Server running on port ${PORT} (API Only Mode)`);
    console.log(`📱 Local API access: http://localhost:${PORT}`);
    console.log(`🌐 Network API access: http://${LOCAL_IP}:${PORT}`);
    startAutomaticInterestScheduler();
});

process.on('SIGINT', () => {
    db.close((err) => {
        if (err) console.error(err.message);
        console.log('Database connection closed.');
        process.exit(0);
    });
});