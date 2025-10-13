const Queue = require('bull');
const createRedisClient = require('../config/redis');

const redisClient = createRedisClient();

const reminderQueue = new Queue('assignment reminders', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
  },
});

const notificationQueue = new Queue('notifications', {
  redis: {
    port: process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || 'localhost',
  },
});

const addReminderJob = async (assignmentId, dueDate, reminderType = 'due_soon') => {
  try {
    const delay = calculateDelay(dueDate, reminderType);

    if (delay > 0) {
      await reminderQueue.add(
        'send-reminder',
        {
          assignmentId,
          reminderType,
          dueDate,
        },
        {
          delay,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );

      console.log(`Reminder job scheduled for assignment ${assignmentId} in ${delay}ms`);
    }
  } catch (error) {
    console.error('Error adding reminder job:', error);
    throw error;
  }
};

const calculateDelay = (dueDate, reminderType) => {
  const now = new Date();
  const due = new Date(dueDate);

  let reminderTime;

  switch (reminderType) {
    case 'due_soon':
      reminderTime = new Date(due.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'due_today':
      reminderTime = new Date(due.getTime() - 60 * 60 * 1000);
      break;
    case 'overdue':
      reminderTime = new Date(due.getTime() + 60 * 60 * 1000);
      break;
    default:
      reminderTime = new Date(due.getTime() - 24 * 60 * 60 * 1000);
  }

  return Math.max(0, reminderTime.getTime() - now.getTime());
};

const removeReminderJobs = async (assignmentId) => {
  try {
    const jobs = await reminderQueue.getJobs(['waiting', 'delayed', 'active']);
    const assignmentJobs = jobs.filter(job => job.data.assignmentId === assignmentId);

    const removePromises = assignmentJobs.map(job => job.remove());
    await Promise.all(removePromises);

    console.log(`Removed ${assignmentJobs.length} reminder jobs for assignment ${assignmentId}`);
  } catch (error) {
    console.error('Error removing reminder jobs:', error);
    throw error;
  }
};

const addNotificationJob = async (notificationData) => {
  try {
    await notificationQueue.add(
      'send-notification',
      notificationData,
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: false,
      }
    );
  } catch (error) {
    console.error('Error adding notification job:', error);
    throw error;
  }
};

const getQueueStats = async () => {
  try {
    const [reminderStats, notificationStats] = await Promise.all([
      {
        waiting: await reminderQueue.getWaiting().then(jobs => jobs.length),
        active: await reminderQueue.getActive().then(jobs => jobs.length),
        completed: await reminderQueue.getCompleted().then(jobs => jobs.length),
        failed: await reminderQueue.getFailed().then(jobs => jobs.length),
        delayed: await reminderQueue.getDelayed().then(jobs => jobs.length),
      },
      {
        waiting: await notificationQueue.getWaiting().then(jobs => jobs.length),
        active: await notificationQueue.getActive().then(jobs => jobs.length),
        completed: await notificationQueue.getCompleted().then(jobs => jobs.length),
        failed: await notificationQueue.getFailed().then(jobs => jobs.length),
        delayed: await notificationQueue.getDelayed().then(jobs => jobs.length),
      },
    ]);

    return {
      reminderQueue: reminderStats,
      notificationQueue: notificationStats,
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }
};

const cleanQueues = async () => {
  try {
    await Promise.all([
      reminderQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      reminderQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
      notificationQueue.clean(24 * 60 * 60 * 1000, 'completed'),
      notificationQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'),
    ]);

    console.log('Queue cleanup completed');
  } catch (error) {
    console.error('Error cleaning queues:', error);
  }
};

module.exports = {
  reminderQueue,
  notificationQueue,
  addReminderJob,
  removeReminderJobs,
  addNotificationJob,
  getQueueStats,
  cleanQueues,
};