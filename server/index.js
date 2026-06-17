require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const path = require('path');

const { errorHandler } = require('./middleware/errorHandler');
const receiptsRouter  = require('./routes/receipts');
const productsRouter  = require('./routes/products');
const analyticsRouter = require('./routes/analytics');
const storesRouter    = require('./routes/stores');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: process.env.REACT_APP_API_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/receipts',  receiptsRouter);
app.use('/api/products',  productsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/stores',    storesRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Error handler (must be last) ──────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 SmartCart server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
