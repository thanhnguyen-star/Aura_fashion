const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const templatesController = require('../controllers/templates.controller');

const router = express.Router();

// Tự tạo thư mục server/uploads/templates nếu chưa có
const uploadDir = path.join(__dirname, '..', 'uploads', 'templates');
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
  limits: { fileSize: 25 * 1024 * 1024 }, // Tối đa 25MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận tệp PNG nền trong suốt (.png)'));
    }
  },
});

router.get('/', requireAdmin, templatesController.getTemplates);
router.post(
  '/',
  requireAdmin,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  templatesController.createTemplate
);
router.put('/:id', requireAdmin, templatesController.updateTemplate);
router.patch('/:id/status', requireAdmin, templatesController.toggleTemplateStatus);
router.delete('/:id', requireAdmin, templatesController.deleteTemplate);

module.exports = router;