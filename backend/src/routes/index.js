const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PickMe3D Backend API is running' });
});

router.use('/users', userRoutes);

module.exports = router;
