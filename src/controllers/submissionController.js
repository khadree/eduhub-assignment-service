const { Assignment, Submission, SubmissionFile } = require('../models');
const { uploadToS3, deleteFromS3, generateSignedUrl } = require('../utils/fileUpload');
const { Op } = require('sequelize');

const createSubmission = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { textSubmission } = req.body;
    const studentId = req.user.id;

    const assignment = await Assignment.findOne({
      where: { id: assignmentId, isActive: true },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or no longer active',
      });
    }

    const now = new Date();
    const isLate = now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({
        success: false,
        error: 'Assignment due date has passed and late submissions are not allowed',
      });
    }

    const existingSubmissions = await Submission.findAll({
      where: { assignmentId, studentId },
      order: [['submissionNumber', 'DESC']],
      limit: 1,
    });

    const submissionNumber = existingSubmissions.length > 0
      ? existingSubmissions[0].submissionNumber + 1
      : 1;

    const submissionData = {
      assignmentId,
      studentId,
      textSubmission,
      status: isLate ? 'late' : 'submitted',
      isLateSubmission: isLate,
      submissionNumber,
    };

    const submission = await Submission.create(submissionData);

    if (req.files && req.files.length > 0) {
      const filePromises = req.files.map(async (file) => {
        const uploadResult = await uploadToS3(file, 'submissions');
        return SubmissionFile.create({
          submissionId: submission.id,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.url,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        });
      });

      await Promise.all(filePromises);
    }

    if (assignment.submissionType === 'file' && (!req.files || req.files.length === 0)) {
      await submission.destroy();
      return res.status(400).json({
        success: false,
        error: 'File submission required for this assignment',
      });
    }

    if (assignment.submissionType === 'text' && !textSubmission) {
      await submission.destroy();
      return res.status(400).json({
        success: false,
        error: 'Text submission required for this assignment',
      });
    }

    const createdSubmission = await Submission.findByPk(submission.id, {
      include: [
        {
          model: SubmissionFile,
          as: 'files',
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'dueDate', 'maxScore'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: createdSubmission,
      message: isLate ? 'Late submission created successfully' : 'Submission created successfully',
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create submission',
      details: error.message,
    });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const {
      assignmentId,
      studentId,
      status,
      page = 1,
      limit = 10,
      sortBy = 'submittedAt',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (assignmentId) {
      whereClause.assignmentId = assignmentId;
    }

    if (studentId && req.user.role !== 'student') {
      whereClause.studentId = studentId;
    }

    if (req.user.role === 'student') {
      whereClause.studentId = req.user.id;
    }

    if (status) {
      whereClause.status = status;
    }

    const includeOptions = [
      {
        model: SubmissionFile,
        as: 'files',
      },
      {
        model: Assignment,
        as: 'assignment',
        attributes: ['id', 'title', 'dueDate', 'maxScore', 'teacherId'],
      },
    ];

    if (req.user.role === 'teacher') {
      includeOptions[1].where = { teacherId: req.user.id };
    }

    const { count, rows: submissions } = await Submission.findAndCountAll({
      where: whereClause,
      include: includeOptions,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve submissions',
      details: error.message,
    });
  }
};

const getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const whereClause = { id };

    if (req.user.role === 'student') {
      whereClause.studentId = req.user.id;
    }

    const includeOptions = [
      {
        model: SubmissionFile,
        as: 'files',
      },
      {
        model: Assignment,
        as: 'assignment',
      },
    ];

    if (req.user.role === 'teacher') {
      includeOptions[1].where = { teacherId: req.user.id };
    }

    const submission = await Submission.findOne({
      where: whereClause,
      include: includeOptions,
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found or access denied',
      });
    }

    res.json({
      success: true,
      data: submission,
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve submission',
      details: error.message,
    });
  }
};

const updateSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { textSubmission } = req.body;
    const studentId = req.user.id;

    const submission = await Submission.findOne({
      where: { id, studentId },
      include: [
        {
          model: Assignment,
          as: 'assignment',
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found or access denied',
      });
    }

    if (submission.status === 'graded') {
      return res.status(400).json({
        success: false,
        error: 'Cannot update graded submission',
      });
    }

    const now = new Date();
    const isLate = now > submission.assignment.dueDate;

    if (isLate && !submission.assignment.allowLateSubmission) {
      return res.status(400).json({
        success: false,
        error: 'Assignment due date has passed and late submissions are not allowed',
      });
    }

    const updateData = {
      textSubmission,
      status: isLate ? 'late' : 'submitted',
      isLateSubmission: isLate,
      submittedAt: new Date(),
    };

    await submission.update(updateData);

    if (req.files && req.files.length > 0) {
      await SubmissionFile.destroy({
        where: { submissionId: submission.id },
      });

      const filePromises = req.files.map(async (file) => {
        const uploadResult = await uploadToS3(file, 'submissions');
        return SubmissionFile.create({
          submissionId: submission.id,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.url,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        });
      });

      await Promise.all(filePromises);
    }

    const updatedSubmission = await Submission.findByPk(submission.id, {
      include: [
        {
          model: SubmissionFile,
          as: 'files',
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'dueDate', 'maxScore'],
        },
      ],
    });

    res.json({
      success: true,
      data: updatedSubmission,
      message: isLate ? 'Late submission updated successfully' : 'Submission updated successfully',
    });
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update submission',
      details: error.message,
    });
  }
};

const deleteSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    const submission = await Submission.findOne({
      where: { id, studentId },
      include: [
        {
          model: SubmissionFile,
          as: 'files',
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found or access denied',
      });
    }

    if (submission.status === 'graded') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete graded submission',
      });
    }

    if (submission.files && submission.files.length > 0) {
      const deletePromises = submission.files.map(file => {
        const key = file.fileUrl.split('/').pop();
        return deleteFromS3(key);
      });
      await Promise.all(deletePromises);
    }

    await submission.destroy();

    res.json({
      success: true,
      message: 'Submission deleted successfully',
    });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete submission',
      details: error.message,
    });
  }
};

const downloadSubmissionFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const submission = await Submission.findOne({
      where: { id },
      include: [
        {
          model: SubmissionFile,
          as: 'files',
          where: { id: fileId },
        },
        {
          model: Assignment,
          as: 'assignment',
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission or file not found',
      });
    }

    if (req.user.role === 'student' && submission.studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    if (req.user.role === 'teacher' && submission.assignment.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const file = submission.files[0];
    const key = file.fileUrl.split('/').pop();
    const signedUrl = await generateSignedUrl(key, 3600);

    res.json({
      success: true,
      data: {
        downloadUrl: signedUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
      },
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download URL',
      details: error.message,
    });
  }
};

module.exports = {
  createSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  downloadSubmissionFile,
};