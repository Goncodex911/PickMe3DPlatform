const express = require('express');
const router = express.Router();
const {
  getMyCollections,
  getCollectionById,
  getUserPublicCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  addTemplateToCollection,
  removeTemplateFromCollection,
} = require('../controllers/collectionController');
const { protect } = require('../middlewares/authMiddleware');

router.route('/').get(protect, getMyCollections).post(protect, createCollection);
router.route('/user/:userId').get(getUserPublicCollections);
router.route('/:id').get(getCollectionById).put(protect, updateCollection).delete(protect, deleteCollection);
router.route('/:id/templates').post(protect, addTemplateToCollection);
router.route('/:id/templates/:templateId').delete(protect, removeTemplateFromCollection);

module.exports = router;
