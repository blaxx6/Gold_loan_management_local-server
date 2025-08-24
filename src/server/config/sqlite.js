const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class SQLiteDB {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../database/financial_app.db');
        
        // Create database directory if it doesn't exist
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
    }

    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables();
                    resolve(this.db);
                }
            });
        });
    }

    initializeTables() {
        const createTables = `
            -- Create customers table with all required fields
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT NOT NULL,
                address TEXT,
                idType TEXT NOT NULL,
                idNumber TEXT NOT NULL,
                balance REAL DEFAULT 0,
                goldWeight REAL DEFAULT 0,
                targetAmount REAL DEFAULT 0,
                lastAutoInterestDate TEXT,
                autoInterestEnabled INTEGER DEFAULT 1,
                accountStatus TEXT DEFAULT 'active',
                profileImage TEXT,
                idDocumentImage TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                lastInterestDate DATETIME,
                CHECK (balance >= 0),
                CHECK (goldWeight >= 0),
                CHECK (targetAmount >= 0),
                CHECK (accountStatus IN ('active', 'completed', 'suspended'))
            );

            -- Create transactions table
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerId INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'interest')),
                amount REAL NOT NULL CHECK (amount > 0),
                date DATETIME DEFAULT CURRENT_TIMESTAMP,
                description TEXT,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            );

            -- Create customer_images table
            CREATE TABLE IF NOT EXISTS customer_images (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerId INTEGER NOT NULL,
                imageType TEXT NOT NULL,
                imagePath TEXT,
                imageName TEXT,
                imageSize INTEGER,
                uploadDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            );

            -- Create auto_interest_log table
            CREATE TABLE IF NOT EXISTS auto_interest_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customerId INTEGER NOT NULL,
                interestAmount REAL NOT NULL,
                appliedDate TEXT NOT NULL,
                balanceBeforeInterest REAL NOT NULL,
                balanceAfterInterest REAL NOT NULL,
                FOREIGN KEY (customerId) REFERENCES customers(id)
            );

            -- Create deleted_customers table for audit
            CREATE TABLE IF NOT EXISTS deleted_customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                originalCustomerId INTEGER NOT NULL,
                customerData TEXT,
                deletionReason TEXT,
                deletionDate DATETIME DEFAULT CURRENT_TIMESTAMP,
                finalBalance REAL,
                totalInterestPaid REAL
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
            CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(accountStatus);
            CREATE INDEX IF NOT EXISTS idx_customers_lastAutoInterest ON customers(lastAutoInterestDate);
            CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customerId);
            CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
            CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
            CREATE INDEX IF NOT EXISTS idx_auto_interest_log_customer ON auto_interest_log(customerId);
            CREATE INDEX IF NOT EXISTS idx_auto_interest_log_date ON auto_interest_log(appliedDate);
        `;

        this.db.exec(createTables, (err) => {
            if (err) {
                console.error('Error creating tables:', err.message);
            } else {
                console.log('Database tables initialized successfully');
            }
        });
    }

    getDatabase() {
        return this.db;
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = new SQLiteDB();
