const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const categoriesController = require('../controllers/categories.controller');

const router = express.Router();

router.get('/', requireAdmin, categoriesController.getCategories);
router.post('/', requireAdmin, categoriesController.createCategory);
router.put('/:id', requireAdmin, categoriesController.updateCategory);
router.patch('/:id/status', requireAdmin, categoriesController.toggleStatus);
router.delete('/:id', requireAdmin, categoriesController.deleteCategory);

module.exports = router;