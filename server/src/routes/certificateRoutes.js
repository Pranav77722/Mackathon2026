const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { generateCertificates, generateSingle } = require('../controllers/certificateController');

router.post('/generate', upload.single('file'), generateCertificates);
router.post('/generate-single', generateSingle);

module.exports = router;
