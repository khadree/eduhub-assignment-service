require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./models');
const { setupAllProcessors } = require('./services/queueProcessor');
const { setupScheduledTasks } = require('./utils/scheduler');
const createRedisClient = require('./config/redis');

const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);

app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    const redisClient = createRedisClient();
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.disconnect();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        redis: 'connected',
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

app.get('/api/status', (req, res) => {
  res.json({
    service: 'assignment-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date().toISOString(),
  });
});

app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);

  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: error.errors.map(err => err.message),
    });
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Resource already exists',
      details: error.errors.map(err => err.message),
    });
  }

  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: 'File size too large',
      details: `Maximum file size is ${process.env.MAX_FILE_SIZE || '10MB'}`,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

const startServer = async () => {
  try {
    console.log('Starting Assignment Service...');

    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    if (process.env.NODE_ENV !== 'test') {
      console.log('Running database migrations...');
      await sequelize.sync();
      console.log('Database synchronized successfully.');
    }

    console.log('Testing Redis connection...');
    const redisClient = createRedisClient();
    await redisClient.connect();
    await redisClient.ping();
    await redisClient.disconnect();
    console.log('Redis connection established successfully.');

    console.log('Setting up queue processors...');
    setupAllProcessors();

    if (process.env.NODE_ENV === 'production') {
      console.log('Setting up scheduled tasks...');
      setupScheduledTasks();
    }

    app.listen(PORT, () => {
      console.log(`Assignment Service running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Health check available at: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

const gracefulShutdown = async () => {
  console.log('Shutting down Assignment Service...');
  try {
    await sequelize.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

if (require.main === module) {
  startServer();
}

module.exports = app;