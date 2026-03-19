const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { generateCertificates, generateSingle, lookupTeamId } = require('../controllers/certificateController');

router.post('/generate', upload.single('file'), generateCertificates);
router.post('/generate-single', generateSingle);
router.get('/lookup-team', lookupTeamId);

module.exports = router;

