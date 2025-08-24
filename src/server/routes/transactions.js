const express = require('express');
const router = express.Router();
const db = require('../config/sqlite');

// Get all transactions with optional pagination
router.get('/', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const query = `
        SELECT t.*, c.name as customerName, c.email as customerEmail
        FROM transactions t
        JOIN customers c ON t.customerId = c.id
        ORDER BY t.date DESC
        LIMIT ? OFFSET ?
    `;
    db.getDatabase().all(query, [limit, offset], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ transactions: rows, limit, offset });
        }
    });
});

// Get transactions by customer ID
router.get('/customer/:customerId', (req, res) => {
    const { customerId } = req.params;
    if (isNaN(Number(customerId))) {
        return res.status(400).json({ error: 'Invalid customer ID' });
    }
    const query = 'SELECT * FROM transactions WHERE customerId = ? ORDER BY date DESC';
    db.getDatabase().all(query, [customerId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ transactions: rows });
        }
    });
});

module.exports = router;