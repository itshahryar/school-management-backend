const express = require('express');
const classController = require('../controllers/classController');
const {
  listClassesValidation,
  classIdValidation,
  createClassValidation,
  updateClassValidation,
} = require('../validations/classValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher, requireActive } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, requireActive, adminOrHigher);

router.get('/', listClassesValidation, classController.listClasses);
router.get('/catalog', classController.getClassesCatalog);
router.post('/', createClassValidation, classController.createClass);
router.get('/:id', classIdValidation, classController.getClass);
router.patch('/:id', updateClassValidation, classController.updateClass);
router.delete('/:id', classIdValidation, classController.deleteClass);

module.exports = router;
