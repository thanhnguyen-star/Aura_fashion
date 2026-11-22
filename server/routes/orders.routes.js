const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const ordersController = require('../controllers/orders.controller');

const router = express.Router();

router.get('/:id', requireAdmin, ordersController.getOrderById);

module.exports = router;