const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

// Tất cả các route quản lý đơn hàng yêu cầu quyền Admin
router.get('/', requireAdmin, ordersController.getOrders);
router.get('/:id', requireAdmin, ordersController.getOrderById);
router.patch('/:id/status', requireAdmin, ordersController.updateOrderStatus);
router.patch('/:id/payment', requireAdmin, ordersController.updateOrderPayment);

module.exports = router;
