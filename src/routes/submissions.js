const express = require('express');
const router = express.Router();
const {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  downloadSubmissionFile,
} = require('../controllers/submissionController');
const {
  gradeSubmission,
  bulkGradeSubmissions,
  getGradingQueue,
  getGradingStats,
  getSubmissionGrades,
} = require('../controllers/gradingController');
const { authenticateToken, requireTeacher, requireStudent } = require('../middleware/auth');
const { validate, submissionSchema, gradeSchema } = require('../middleware/validation');
const { upload } = require('../utils/fileUpload');

router.use(authenticateToken);

router.post(
  '/assignment/:assignmentId',
  requireStudent,
  upload.array('files', 3),
  validate(submissionSchema),
  createSubmission
);

router.get('/', requireStudent, getSubmissions);

router.get('/grading/queue', requireTeacher, getGradingQueue);

router.get('/grading/stats', requireTeacher, getGradingStats);

router.get('/assignment/:assignmentId/grades', requireTeacher, getSubmissionGrades);

router.get('/:id', requireStudent, getSubmissionById);

router.put(
  '/:id',
  requireStudent,
  upload.array('files', 3),
  validate(submissionSchema),
  updateSubmission
);

router.delete('/:id', requireStudent, deleteSubmission);

router.get('/:id/files/:fileId/download', requireStudent, downloadSubmissionFile);

router.post(
  '/:id/grade',
  requireTeacher,
  validate(gradeSchema),
  gradeSubmission
);

router.post(
  '/grade/bulk',
  requireTeacher,
  bulkGradeSubmissions
);

module.exports = router;