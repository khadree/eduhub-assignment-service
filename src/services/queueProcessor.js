const { reminderQueue, notificationQueue } = require('./queueService');
const {
  sendAssignmentDueReminder,
  sendNotificationToService,
} = require('./notificationService');

const setupReminderProcessor = () => {
  reminderQueue.process('send-reminder', async (job) => {
    const { assignmentId, reminderType } = job.data;

    try {
      console.log(`Processing reminder job: ${reminderType} for assignment ${assignmentId}`);

      await sendAssignmentDueReminder(assignmentId, reminderType);

      console.log(`Reminder job completed: ${reminderType} for assignment ${assignmentId}`);
      return { success: true, assignmentId, reminderType };
    } catch (error) {
      console.error(`Reminder job failed: ${reminderType} for assignment ${assignmentId}`, error);
      throw error;
    }
  });

  reminderQueue.on('completed', (job, result) => {
    console.log(`Reminder job ${job.id} completed:`, result);
  });

  reminderQueue.on('failed', (job, err) => {
    console.error(`Reminder job ${job.id} failed:`, err.message);
  });

  reminderQueue.on('stalled', (job) => {
    console.warn(`Reminder job ${job.id} stalled and will be retried`);
  });

  console.log('Reminder queue processor setup completed');
};

const setupNotificationProcessor = () => {
  notificationQueue.process('send-notification', async (job) => {
    const notificationData = job.data;

    try {
      console.log(`Processing notification job: ${notificationData.type}`);

      await sendNotificationToService(notificationData);

      console.log(`Notification job completed: ${notificationData.type}`);
      return { success: true, type: notificationData.type };
    } catch (error) {
      console.error(`Notification job failed: ${notificationData.type}`, error);
      throw error;
    }
  });

  notificationQueue.on('completed', (job, result) => {
    console.log(`Notification job ${job.id} completed:`, result);
  });

  notificationQueue.on('failed', (job, err) => {
    console.error(`Notification job ${job.id} failed:`, err.message);
  });

  notificationQueue.on('stalled', (job) => {
    console.warn(`Notification job ${job.id} stalled and will be retried`);
  });

  console.log('Notification queue processor setup completed');
};

const setupAllProcessors = () => {
  setupReminderProcessor();
  setupNotificationProcessor();
  console.log('All queue processors setup completed');
};

const gracefulShutdown = async () => {
  console.log('Gracefully shutting down queue processors...');

  try {
    await Promise.all([
      reminderQueue.close(),
      notificationQueue.close(),
    ]);

    console.log('Queue processors shut down successfully');
  } catch (error) {
    console.error('Error during queue processor shutdown:', error);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = {
  setupAllProcessors,
  setupReminderProcessor,
  setupNotificationProcessor,
  gracefulShutdown,
};