const express = require('express');
const subjectController = require('../controllers/subjectController');
const {
  listSubjectsValidation,
  subjectIdValidation,
  createSubjectValidation,
  updateSubjectValidation,
} = require('../validations/subjectValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, adminOrHigher);

router.get('/', listSubjectsValidation, subjectController.listSubjects);
router.post('/', createSubjectValidation, subjectController.createSubject);
router.get('/:id', subjectIdValidation, subjectController.getSubject);
router.patch('/:id', updateSubjectValidation, subjectController.updateSubject);
router.delete('/:id', subjectIdValidation, subjectController.deleteSubject);

module.exports = router;
