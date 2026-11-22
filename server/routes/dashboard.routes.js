const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/', requireAdmin, dashboardController.getDashboard);

module.exports = router;