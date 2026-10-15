const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/complete', aiController.complete);
router.post('/test', aiController.testConnection);

module.exports = router;
