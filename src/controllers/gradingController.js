const { Assignment, Submission, SubmissionFile } = require('../models');
const { Op } = require('sequelize');

const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, feedback } = req.body;
    const teacherId = req.user.id;

    const submission = await Submission.findOne({
      where: { id },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: { teacherId },
        },
      ],
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found or access denied',
      });
    }

    if (score > submission.assignment.maxScore) {
      return res.status(400).json({
        success: false,
        error: `Score cannot exceed maximum score of ${submission.assignment.maxScore}`,
      });
    }

    const updateData = {
      score,
      feedback,
      status: 'graded',
      gradedAt: new Date(),
      gradedBy: teacherId,
    };

    await submission.update(updateData);

    const gradedSubmission = await Submission.findByPk(submission.id, {
      include: [
        {
          model: SubmissionFile,
          as: 'files',
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'maxScore'],
        },
      ],
    });

    res.json({
      success: true,
      data: gradedSubmission,
      message: 'Submission graded successfully',
    });
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grade submission',
      details: error.message,
    });
  }
};

const bulkGradeSubmissions = async (req, res) => {
  try {
    const { submissions } = req.body;
    const teacherId = req.user.id;

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Submissions array is required and cannot be empty',
      });
    }

    const submissionIds = submissions.map(sub => sub.id);

    const validSubmissions = await Submission.findAll({
      where: { id: { [Op.in]: submissionIds } },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: { teacherId },
        },
      ],
    });

    if (validSubmissions.length !== submissions.length) {
      return res.status(400).json({
        success: false,
        error: 'Some submissions not found or access denied',
      });
    }

    const updatePromises = submissions.map(async (submissionData) => {
      const { id, score, feedback } = submissionData;
      const submission = validSubmissions.find(s => s.id === id);

      if (score > submission.assignment.maxScore) {
        throw new Error(`Score for submission ${id} cannot exceed maximum score of ${submission.assignment.maxScore}`);
      }

      return submission.update({
        score,
        feedback,
        status: 'graded',
        gradedAt: new Date(),
        gradedBy: teacherId,
      });
    });

    await Promise.all(updatePromises);

    const gradedSubmissions = await Submission.findAll({
      where: { id: { [Op.in]: submissionIds } },
      include: [
        {
          model: SubmissionFile,
          as: 'files',
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title', 'maxScore'],
        },
      ],
    });

    res.json({
      success: true,
      data: gradedSubmissions,
      message: `${submissions.length} submissions graded successfully`,
    });
  } catch (error) {
    console.error('Bulk grade submissions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to grade submissions',
      details: error.message,
    });
  }
};

const getGradingQueue = async (req, res) => {
  try {
    const {
      courseId,
      assignmentId,
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'ASC',
    } = req.query;

    const offset = (page - 1) * limit;
    const teacherId = req.user.id;

    const whereClause = {
      status: { [Op.in]: ['submitted', 'late'] },
    };

    const assignmentWhereClause = { teacherId };

    if (courseId) {
      assignmentWhereClause.courseId = courseId;
    }

    if (assignmentId) {
      assignmentWhereClause.id = assignmentId;
    }

    const { count, rows: submissions } = await Submission.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
          attributes: ['id', 'title', 'courseId', 'dueDate', 'maxScore'],
        },
        {
          model: SubmissionFile,
          as: 'files',
        },
      ],
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
    console.error('Get grading queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve grading queue',
      details: error.message,
    });
  }
};

const getGradingStats = async (req, res) => {
  try {
    const { courseId, assignmentId } = req.query;
    const teacherId = req.user.id;

    const assignmentWhereClause = { teacherId };

    if (courseId) {
      assignmentWhereClause.courseId = courseId;
    }

    if (assignmentId) {
      assignmentWhereClause.id = assignmentId;
    }

    const pendingGrading = await Submission.count({
      where: { status: { [Op.in]: ['submitted', 'late'] } },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
        },
      ],
    });

    const gradedSubmissions = await Submission.count({
      where: { status: 'graded' },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
        },
      ],
    });

    const lateSubmissions = await Submission.count({
      where: { status: 'late' },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
        },
      ],
    });

    const averageScore = await Submission.findOne({
      where: {
        status: 'graded',
        score: { [Op.ne]: null },
      },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
        },
      ],
      attributes: [
        [require('sequelize').fn('AVG', require('sequelize').col('score')), 'averageScore'],
      ],
      raw: true,
    });

    const gradingHistory = await Submission.findAll({
      where: {
        status: 'graded',
        gradedAt: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: [
        {
          model: Assignment,
          as: 'assignment',
          where: assignmentWhereClause,
        },
      ],
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('graded_at')), 'date'],
        [require('sequelize').fn('COUNT', require('sequelize').col('Submission.id')), 'count'],
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('graded_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('graded_at')), 'ASC']],
      raw: true,
    });

    res.json({
      success: true,
      data: {
        pendingGrading,
        gradedSubmissions,
        lateSubmissions,
        averageScore: parseFloat(averageScore?.averageScore || 0).toFixed(2),
        gradingHistory,
      },
    });
  } catch (error) {
    console.error('Get grading stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve grading statistics',
      details: error.message,
    });
  }
};

const getSubmissionGrades = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const {
      page = 1,
      limit = 50,
      sortBy = 'score',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;
    const teacherId = req.user.id;

    const assignment = await Assignment.findOne({
      where: { id: assignmentId, teacherId },
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found or access denied',
      });
    }

    const { count, rows: submissions } = await Submission.findAndCountAll({
      where: {
        assignmentId,
        status: 'graded',
      },
      attributes: ['id', 'studentId', 'score', 'feedback', 'gradedAt', 'isLateSubmission'],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          maxScore: assignment.maxScore,
        },
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
    console.error('Get submission grades error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve submission grades',
      details: error.message,
    });
  }
};

module.exports = {
  gradeSubmission,
  bulkGradeSubmissions,
  getGradingQueue,
  getGradingStats,
  getSubmissionGrades,
};