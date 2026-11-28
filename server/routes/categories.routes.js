const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const categoriesController = require('../controllers/categories.controller');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'categories');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận ảnh định dạng PNG, JPG, JPEG hoặc WEBP'));
    }
  },
});

router.get('/', requireAdmin, categoriesController.getCategories);
router.post(
  '/upload-image',
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  categoriesController.uploadCategoryImage
);
router.post('/', requireAdmin, categoriesController.createCategory);
router.post('/:id/transfer-products', requireAdmin, categoriesController.transferCategoryProducts);
router.patch('/reorder', requireAdmin, categoriesController.reorderCategory);
router.put('/:id', requireAdmin, categoriesController.updateCategory);
router.patch('/:id/status', requireAdmin, categoriesController.toggleStatus);
router.delete('/:id', requireAdmin, categoriesController.deleteCategory);

module.exports = router;
