const express = require('express');
const noteController = require('../controllers/noteController');
const {
  listNotesValidation,
  noteIdValidation,
  createNoteValidation,
  updateNoteValidation,
} = require('../validations/noteValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, adminOrHigher);

router.get('/', listNotesValidation, noteController.listNotes);
router.post('/', createNoteValidation, noteController.createNote);
router.get('/:id', noteIdValidation, noteController.getNote);
router.patch('/:id', updateNoteValidation, noteController.updateNote);
router.delete('/:id', noteIdValidation, noteController.deleteNote);

module.exports = router;
