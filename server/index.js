const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const ordersRoutes = require('./routes/orders.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const templatesRoutes = require('./routes/templates.routes');
const customersRoutes = require('./routes/customers.routes');
const storeRoutes = require('./routes/store.routes');


const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: process.env.DB_NAME });
  } catch (err) {
    console.error('[index > health]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Các phân hệ API
app.use('/api/auth', authRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/orders', ordersRoutes);
app.use('/api/admin/products', productsRoutes);
app.use('/api/admin/categories', categoriesRoutes);
app.use('/api/admin/templates', templatesRoutes);
app.use('/api/admin/customers', customersRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otp_codes (
      email VARCHAR(320) NOT NULL PRIMARY KEY,
      code VARCHAR(6) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      INDEX idx_otp_codes_expires_at (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  const otpCleanupTimer = setInterval(async () => {
    try {
      await pool.query('DELETE FROM otp_codes WHERE expires_at < NOW()');
    } catch (err) {
      console.error('[index > OTP cleanup]', err.message);
    }
  }, 5 * 60 * 1000);
  otpCleanupTimer.unref();

  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[index > startup]', err.message);
  process.exit(1);
});