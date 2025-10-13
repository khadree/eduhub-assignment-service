const axios = require('axios');
const { Assignment, Submission } = require('../models');

const sendNotificationToService = async (notificationData) => {
  try {
    const response = await axios.post(
      `${process.env.NOTIFICATION_SERVICE_URL}/api/notifications`,
      notificationData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SERVICE_TOKEN}`,
        },
        timeout: 10000,
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending notification to service:', error.message);
    throw error;
  }
};

const sendAssignmentDueReminder = async (assignmentId, reminderType) => {
  try {
    const assignment = await Assignment.findByPk(assignmentId, {
      include: [
        {
          model: Submission,
          as: 'submissions',
          attributes: ['studentId'],
        },
      ],
    });

    if (!assignment) {
      console.error(`Assignment ${assignmentId} not found for reminder`);
      return;
    }

    const submittedStudentIds = assignment.submissions.map(sub => sub.studentId);

    const notificationData = {
      type: 'assignment_reminder',
      title: getNotificationTitle(reminderType),
      message: getNotificationMessage(assignment, reminderType),
      recipients: {
        courseId: assignment.courseId,
        excludeStudentIds: submittedStudentIds,
        includeTeacher: false,
      },
      data: {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        dueDate: assignment.dueDate,
        reminderType,
      },
      priority: reminderType === 'overdue' ? 'high' : 'normal',
      channels: ['email', 'push'],
    };

    await sendNotificationToService(notificationData);
    console.log(`${reminderType} reminder sent for assignment: ${assignment.title}`);
  } catch (error) {
    console.error('Error sending assignment reminder:', error);
    throw error;
  }
};

const sendAssignmentCreatedNotification = async (assignmentId) => {
  try {
    const assignment = await Assignment.findByPk(assignmentId);

    if (!assignment) {
      console.error(`Assignment ${assignmentId} not found for notification`);
      return;
    }

    const notificationData = {
      type: 'assignment_created',
      title: 'New Assignment Posted',
      message: `A new assignment "${assignment.title}" has been posted. Due date: ${new Date(assignment.dueDate).toLocaleDateString()}`,
      recipients: {
        courseId: assignment.courseId,
        includeTeacher: false,
      },
      data: {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        dueDate: assignment.dueDate,
      },
      priority: 'normal',
      channels: ['email', 'push'],
    };

    await sendNotificationToService(notificationData);
    console.log(`Assignment created notification sent for: ${assignment.title}`);
  } catch (error) {
    console.error('Error sending assignment created notification:', error);
    throw error;
  }
};

const sendSubmissionReceivedNotification = async (submissionId) => {
  try {
    const submission = await Submission.findByPk(submissionId, {
      include: [
        {
          model: Assignment,
          as: 'assignment',
        },
      ],
    });

    if (!submission) {
      console.error(`Submission ${submissionId} not found for notification`);
      return;
    }

    const notificationData = {
      type: 'submission_received',
      title: 'Assignment Submitted',
      message: `Your submission for "${submission.assignment.title}" has been received successfully.`,
      recipients: {
        studentIds: [submission.studentId],
      },
      data: {
        submissionId: submission.id,
        assignmentId: submission.assignment.id,
        assignmentTitle: submission.assignment.title,
        submittedAt: submission.submittedAt,
        isLate: submission.isLateSubmission,
      },
      priority: 'normal',
      channels: ['email', 'push'],
    };

    await sendNotificationToService(notificationData);

    const teacherNotificationData = {
      type: 'new_submission',
      title: 'New Submission Received',
      message: `A new submission has been received for "${submission.assignment.title}".`,
      recipients: {
        teacherIds: [submission.assignment.teacherId],
      },
      data: {
        submissionId: submission.id,
        assignmentId: submission.assignment.id,
        assignmentTitle: submission.assignment.title,
        studentId: submission.studentId,
        submittedAt: submission.submittedAt,
        isLate: submission.isLateSubmission,
      },
      priority: 'normal',
      channels: ['push'],
    };

    await sendNotificationToService(teacherNotificationData);
    console.log(`Submission notifications sent for assignment: ${submission.assignment.title}`);
  } catch (error) {
    console.error('Error sending submission received notification:', error);
    throw error;
  }
};

const sendGradedNotification = async (submissionId) => {
  try {
    const submission = await Submission.findByPk(submissionId, {
      include: [
        {
          model: Assignment,
          as: 'assignment',
        },
      ],
    });

    if (!submission) {
      console.error(`Submission ${submissionId} not found for notification`);
      return;
    }

    const notificationData = {
      type: 'submission_graded',
      title: 'Assignment Graded',
      message: `Your submission for "${submission.assignment.title}" has been graded. Score: ${submission.score}/${submission.assignment.maxScore}`,
      recipients: {
        studentIds: [submission.studentId],
      },
      data: {
        submissionId: submission.id,
        assignmentId: submission.assignment.id,
        assignmentTitle: submission.assignment.title,
        score: submission.score,
        maxScore: submission.assignment.maxScore,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt,
      },
      priority: 'normal',
      channels: ['email', 'push'],
    };

    await sendNotificationToService(notificationData);
    console.log(`Grade notification sent for submission: ${submissionId}`);
  } catch (error) {
    console.error('Error sending graded notification:', error);
    throw error;
  }
};

const getNotificationTitle = (reminderType) => {
  switch (reminderType) {
    case 'due_soon':
      return 'Assignment Due Tomorrow';
    case 'due_today':
      return 'Assignment Due Soon';
    case 'overdue':
      return 'Assignment Overdue';
    default:
      return 'Assignment Reminder';
  }
};

const getNotificationMessage = (assignment, reminderType) => {
  const dueDate = new Date(assignment.dueDate).toLocaleString();

  switch (reminderType) {
    case 'due_soon':
      return `Reminder: "${assignment.title}" is due tomorrow (${dueDate}). Don't forget to submit your work!`;
    case 'due_today':
      return `Urgent: "${assignment.title}" is due in 1 hour (${dueDate}). Submit now to avoid late submission!`;
    case 'overdue':
      return `"${assignment.title}" was due on ${dueDate}. ${assignment.allowLateSubmission ? 'Late submissions are still accepted.' : 'Contact your teacher for assistance.'}`;
    default:
      return `Reminder: "${assignment.title}" is due on ${dueDate}.`;
  }
};

module.exports = {
  sendNotificationToService,
  sendAssignmentDueReminder,
  sendAssignmentCreatedNotification,
  sendSubmissionReceivedNotification,
  sendGradedNotification,
};