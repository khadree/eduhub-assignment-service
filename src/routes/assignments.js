const express = require('express');
const router = express.Router();
const {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats,
} = require('../controllers/assignmentController');
const { authenticateToken, requireTeacher, requireStudent } = require('../middleware/auth');
const { validate, assignmentSchema, updateAssignmentSchema } = require('../middleware/validation');
const { upload } = require('../utils/fileUpload');

router.use(authenticateToken);

router.post(
  '/',
  requireTeacher,
  upload.array('attachments', 5),
  validate(assignmentSchema),
  createAssignment
);

router.get('/', requireStudent, getAssignments);

router.get('/stats', requireStudent, getAssignmentStats);

router.get('/:id', requireStudent, getAssignmentById);

router.put(
  '/:id',
  requireTeacher,
  upload.array('attachments', 5),
  validate(updateAssignmentSchema),
  updateAssignment
);

router.delete('/:id', requireTeacher, deleteAssignment);

module.exports = router;