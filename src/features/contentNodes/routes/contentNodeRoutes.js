const express = require('express');
const contentNodeController = require('../controllers/contentNodeController');
const {
  listContentNodesValidation,
  contentNodeIdValidation,
  createContentNodeValidation,
  updateContentNodeValidation,
} = require('../validations/contentNodeValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher, requireActive } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, requireActive, adminOrHigher);

router.get('/', listContentNodesValidation, contentNodeController.listContentNodes);
router.post('/', createContentNodeValidation, contentNodeController.createContentNode);
router.get('/:id', contentNodeIdValidation, contentNodeController.getContentNode);
router.patch('/:id', updateContentNodeValidation, contentNodeController.updateContentNode);
router.delete('/:id', contentNodeIdValidation, contentNodeController.deleteContentNode);

module.exports = router;
