const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const productsController = require('../controllers/products.controller');

const router = express.Router();

router.get('/', requireAdmin, productsController.getProducts);
router.post('/', requireAdmin, productsController.createProduct);
router.put('/:id', requireAdmin, productsController.updateProduct);
router.patch('/:id/featured', requireAdmin, productsController.toggleFeatured);

module.exports = router;