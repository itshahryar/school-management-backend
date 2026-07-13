const express = require('express');
const testController = require('../controllers/testController');
const {
  listTestsValidation,
  testIdValidation,
  generateTestValidation,
  updateTestValidation,
  createManualTestValidation,
  replaceQuestionsValidation,
  transitionTestValidation,
} = require('../validations/testValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher, requireActive } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, requireActive, adminOrHigher);

router.get('/', listTestsValidation, testController.listTests);
router.post('/generate', generateTestValidation, testController.generateTest);
router.post('/manual', createManualTestValidation, testController.createManualTest);
router.get('/:id', testIdValidation, testController.getTest);
router.patch('/:id', updateTestValidation, testController.updateTest);
router.put(
  '/:id/questions',
  replaceQuestionsValidation,
  testController.replaceTestQuestions
);
router.post(
  '/:id/transition',
  transitionTestValidation,
  testController.transitionTest
);
router.delete('/:id', testIdValidation, testController.deleteTest);

module.exports = router;
