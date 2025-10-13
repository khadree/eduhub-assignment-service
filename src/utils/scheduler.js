const cron = require('node-cron');
const { Assignment } = require('../models');
const { addReminderJob, cleanQueues } = require('../services/queueService');
const { Op } = require('sequelize');

const scheduleAssignmentReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const assignmentsDueTomorrow = await Assignment.findAll({
      where: {
        dueDate: {
          [Op.gte]: tomorrow,
          [Op.lt]: dayAfterTomorrow,
        },
        isActive: true,
      },
    });

    for (const assignment of assignmentsDueTomorrow) {
      await addReminderJob(assignment.id, assignment.dueDate, 'due_soon');
      await addReminderJob(assignment.id, assignment.dueDate, 'due_today');
      await addReminderJob(assignment.id, assignment.dueDate, 'overdue');
    }

    console.log(`Scheduled reminders for ${assignmentsDueTomorrow.length} assignments due tomorrow`);
  } catch (error) {
    console.error('Error scheduling assignment reminders:', error);
  }
};

const setupScheduledTasks = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('Running daily reminder scheduling task...');
    await scheduleAssignmentReminders();
  });

  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily queue cleanup task...');
    await cleanQueues();
  });

  cron.schedule('0 */6 * * *', () => {
    console.log('Queue health check - processors are running');
  });

  console.log('Scheduled tasks setup completed');
  console.log('Daily reminder scheduling: 8:00 AM');
  console.log('Daily queue cleanup: 2:00 AM');
  console.log('Queue health check: Every 6 hours');
};

const manualReminderSchedule = async (days = 1) => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const assignments = await Assignment.findAll({
      where: {
        dueDate: {
          [Op.gte]: targetDate,
          [Op.lt]: nextDay,
        },
        isActive: true,
      },
    });

    for (const assignment of assignments) {
      await addReminderJob(assignment.id, assignment.dueDate, 'due_soon');
      await addReminderJob(assignment.id, assignment.dueDate, 'due_today');
      await addReminderJob(assignment.id, assignment.dueDate, 'overdue');
    }

    console.log(`Manually scheduled reminders for ${assignments.length} assignments due in ${days} day(s)`);
    return assignments.length;
  } catch (error) {
    console.error('Error manually scheduling reminders:', error);
    throw error;
  }
};

module.exports = {
  setupScheduledTasks,
  scheduleAssignmentReminders,
  manualReminderSchedule,
};