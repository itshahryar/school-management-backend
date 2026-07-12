const express = require('express');
const testController = require('../controllers/testController');
const {
  listTestsValidation,
  testIdValidation,
  generateTestValidation,
  updateTestValidation,
} = require('../validations/testValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, adminOrHigher);

router.get('/', listTestsValidation, testController.listTests);
router.post('/generate', generateTestValidation, testController.generateTest);
router.get('/:id', testIdValidation, testController.getTest);
router.patch('/:id', updateTestValidation, testController.updateTest);
router.delete('/:id', testIdValidation, testController.deleteTest);

module.exports = router;
