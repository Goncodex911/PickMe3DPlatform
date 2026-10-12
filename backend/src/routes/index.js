const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const templateRoutes = require('./templateRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PickMe3D Backend API is running' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/templates', templateRoutes);

module.exports = router;

