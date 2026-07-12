const express = require('express');
const testMetaController = require('../controllers/testMetaController');
const {
  listMetaValidation,
  createMetaValidation,
  updateMetaValidation,
  metaIdValidation,
} = require('../validations/testMetaValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, adminOrHigher);

router.get('/types', listMetaValidation, testMetaController.listTestTypes);
router.post('/types', createMetaValidation, testMetaController.createTestType);
router.patch('/types/:id', updateMetaValidation, testMetaController.updateTestType);
router.delete('/types/:id', metaIdValidation, testMetaController.deleteTestType);

router.get('/statuses', listMetaValidation, testMetaController.listTestStatuses);
router.post('/statuses', createMetaValidation, testMetaController.createTestStatus);
router.patch('/statuses/:id', updateMetaValidation, testMetaController.updateTestStatus);
router.delete('/statuses/:id', metaIdValidation, testMetaController.deleteTestStatus);

module.exports = router;
