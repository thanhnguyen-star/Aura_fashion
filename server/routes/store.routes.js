const express = require('express');
const storeController = require('../controllers/store.controller');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/products', storeController.getProducts);
router.get('/products/:id', storeController.getProductDetail);
router.get('/templates', storeController.getTemplates);
router.get('/categories', storeController.getCategories);
router.post('/orders', optionalAuth, storeController.createOrder);

// Khách hàng: Lịch sử đơn hàng & Hủy đơn hàng (Screens 15-18 Figma)
router.get('/my-orders', requireAuth, storeController.getMyOrders);
router.get('/my-orders/:id', requireAuth, storeController.getMyOrderDetail);
router.post('/my-orders/:id/cancel', requireAuth, storeController.cancelMyOrder);

module.exports = router;

