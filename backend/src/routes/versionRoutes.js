const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getVersions,
  getVersionById,
  createVersion,
  rollbackVersion,
  deleteVersion,
} = require('../controllers/versionController');

// Optional auth helper: populates req.user if token is present, does not reject if absent
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'super_secret_pickme3d_jwt_key_2024';
      const decoded = jwt.verify(token, secret);
      req.user = await User.findById(decoded.id);
    } catch (e) {
      // ignore token parse errors for optional auth
    }
  }
  next();
};

router.route('/')
  .get(getVersions)
  .post(optionalAuth, createVersion);

router.route('/:versionId')
  .get(getVersionById)
  .delete(optionalAuth, deleteVersion);

router.post('/:versionId/rollback', optionalAuth, rollbackVersion);

module.exports = router;

