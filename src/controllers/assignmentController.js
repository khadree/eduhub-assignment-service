const { Assignment, Submission, AssignmentAttachment, SubmissionFile } = require('../models');
const { uploadToS3, deleteFromS3 } = require('../utils/fileUpload');
const { Op } = require('sequelize');

const createAssignment = async (req, res) => {
  try {
    const assignmentData = {
      ...req.body,
      teacherId: req.user.id,
    };

    const assignment = await Assignment.create(assignmentData);

    if (req.files && req.files.length > 0) {
      const attachmentPromises = req.files.map(async (file) => {
        const uploadResult = await uploadToS3(file, 'assignment-attachments');
        return AssignmentAttachment.create({
          assignmentId: assignment.id,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.url,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        });
      });

      await Promise.all(attachmentPromises);
    }

    const createdAssignment = await Assignment.findByPk(assignment.id, {
      include: [
        {
          model: AssignmentAttachment,
          as: 'attachments',
        },
      ],
    });

    res.status(201).json({
      success: true,
      data: createdAssignment,
    });
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create assignment',
      details: error.message,
    });
  }
};

const getAssignments = async (req, res) => {
  try {
    const {
      courseId,
      page = 1,
      limit = 10,
      status = 'active',
      sortBy = 'dueDate',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    }

    const { count, rows: assignments } = await Assignment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: AssignmentAttachment,
          as: 'attachments',
        },
        {
          model: Submission,
          as: 'submissions',
          required: false,
          where: req.user.role === 'student' ? { studentId: req.user.id } : undefined,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignments',
      details: error.message,
    });
  }
};

const getAssignmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const whereClause = { id };

    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    }

    const assignment = await Assignment.findOne({
      where: whereClause,
      include: [
        {
          model: AssignmentAttachment,
          as: 'attachments',
        },
        {
          model: Submission,
          as: 'submissions',
          include: [
            {
              model: SubmissionFile,
              as: 'files',
            },
          ],
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    res.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignment',
      details: error.message,
    });
  }
};

const updateAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assignment = await Assignment.findOne({
      where: {
        id,
        teacherId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied',
      });
    }

    await assignment.update(updateData);

    if (req.files && req.files.length > 0) {
      const attachmentPromises = req.files.map(async (file) => {
        const uploadResult = await uploadToS3(file, 'assignment-attachments');
        return AssignmentAttachment.create({
          assignmentId: assignment.id,
          fileName: uploadResult.fileName,
          fileUrl: uploadResult.url,
          fileSize: uploadResult.size,
          mimeType: uploadResult.mimeType,
        });
      });

      await Promise.all(attachmentPromises);
    }

    const updatedAssignment = await Assignment.findByPk(assignment.id, {
      include: [
        {
          model: AssignmentAttachment,
          as: 'attachments',
        },
      ],
    });

    res.json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update assignment',
      details: error.message,
    });
  }
};

const deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await Assignment.findOne({
      where: {
        id,
        teacherId: req.user.id,
      },
      include: [
        {
          model: AssignmentAttachment,
          as: 'attachments',
        },
      ],
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied',
      });
    }

    if (assignment.attachments && assignment.attachments.length > 0) {
      const deletePromises = assignment.attachments.map(attachment => {
        const key = attachment.fileUrl.split('/').pop();
        return deleteFromS3(key);
      });
      await Promise.all(deletePromises);
    }

    await assignment.destroy();

    res.json({
      success: true,
      message: 'Assignment deleted successfully',
    });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete assignment',
      details: error.message,
    });
  }
};

const getAssignmentStats = async (req, res) => {
  try {
    const { courseId } = req.query;
    const whereClause = {};

    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (req.user.role === 'teacher') {
      whereClause.teacherId = req.user.id;
    }

    const totalAssignments = await Assignment.count({
      where: { ...whereClause, isActive: true },
    });

    const overdueAssignments = await Assignment.count({
      where: {
        ...whereClause,
        isActive: true,
        dueDate: { [Op.lt]: new Date() },
      },
    });

    const upcomingAssignments = await Assignment.count({
      where: {
        ...whereClause,
        isActive: true,
        dueDate: { [Op.gt]: new Date() },
      },
    });

    const totalSubmissions = await Submission.count({
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: whereClause,
        },
      ],
    });

    const gradedSubmissions = await Submission.count({
      where: { status: 'graded' },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: whereClause,
        },
      ],
    });

    res.json({
      success: true,
      data: {
        totalAssignments,
        overdueAssignments,
        upcomingAssignments,
        totalSubmissions,
        gradedSubmissions,
        pendingGrading: totalSubmissions - gradedSubmissions,
      },
    });
  } catch (error) {
    console.error('Get assignment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve assignment statistics',
      details: error.message,
    });
  }
};

module.exports = {
  createAssignment,
  getAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
  getAssignmentStats,
};