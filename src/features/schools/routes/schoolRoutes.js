const express = require('express');
const schoolController = require('../controllers/schoolController');
const {
  listSchoolsValidation,
  schoolIdValidation,
  createSchoolValidation,
  updateSchoolValidation,
} = require('../validations/schoolValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher, ownerOnly, requireActive } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, requireActive);

router.get('/me', adminOrHigher, schoolController.getMySchools);
router.get(
  '/:id/curriculum',
  adminOrHigher,
  schoolIdValidation,
  schoolController.getSchoolCurriculum
);

router.use(ownerOnly);

router.get('/', listSchoolsValidation, schoolController.listSchools);
router.post('/', createSchoolValidation, schoolController.createSchool);
router.get('/:id', schoolIdValidation, schoolController.getSchool);
router.patch('/:id', updateSchoolValidation, schoolController.updateSchool);
router.delete('/:id', schoolIdValidation, schoolController.deleteSchool);

module.exports = router;
