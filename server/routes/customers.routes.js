const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const customersController = require('../controllers/customers.controller');

const router = express.Router();

router.get('/', requireAdmin, customersController.getCustomers);
router.patch('/:id/toggle-lock', requireAdmin, customersController.toggleCustomerLock);

module.exports = router;
