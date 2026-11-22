const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const ordersRoutes = require('./routes/orders.routes');
const productsRoutes = require('./routes/products.routes');
const categoriesRoutes = require('./routes/categories.routes');
const templatesRoutes = require('./routes/templates.routes');


const app = express();
app.use(cors());
app.use(express.json());

// Kiểm tra kết nối server + MySQL
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: process.env.DB_NAME });
  } catch (err) {
    console.error('[index > health]', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Các phân hệ Admin hiện có
app.use('/api/admin', authRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/orders', ordersRoutes);
app.use('/api/admin/products', productsRoutes);
app.use('/api/admin/categories', categoriesRoutes);
app.use('/api/admin/templates', templatesRoutes);


// app.use('/api/admin/templates', require('./routes/templates.routes'));
// app.use('/api/admin/customers', require('./routes/customers.routes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});