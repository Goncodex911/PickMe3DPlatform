const express = require('express');
const router = express.Router();
const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const templateRoutes = require('./templateRoutes');
const notificationRoutes = require('./notificationRoutes');
const commentRoutes = require('./commentRoutes');
const collectionRoutes = require('./collectionRoutes');
const aiRoutes = require('./aiRoutes');

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'PickMe3D Backend API is running' });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/templates', templateRoutes);
router.use('/notifications', notificationRoutes);
router.use('/comments', commentRoutes);
router.use('/collections', collectionRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
