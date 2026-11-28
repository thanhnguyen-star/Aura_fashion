const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const productsController = require('../controllers/products.controller');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
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

router.get('/', requireAdmin, productsController.getProducts);
router.post(
  '/upload-image',
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  productsController.uploadProductImage
);
router.post('/', requireAdmin, productsController.createProduct);
router.put('/:id', requireAdmin, productsController.updateProduct);
router.delete('/:id', requireAdmin, productsController.deleteProduct);
router.patch('/:id/featured', requireAdmin, productsController.toggleFeatured);

// API Biến thể sản phẩm (có requireAdmin)
router.get('/:id/variants', requireAdmin, productsController.getProductVariants);
router.post('/:id/variants', requireAdmin, productsController.createProductVariant);
router.put('/:id/variants/:variantId', requireAdmin, productsController.updateProductVariant);
router.delete('/:id/variants/:variantId', requireAdmin, productsController.deleteProductVariant);

module.exports = router;
