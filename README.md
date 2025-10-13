# Assignment Service - EduHub Academy

A microservice for managing assignments, submissions, and grading in the EduHub Academy Learning Management System.

## Features

### Core Functionality
- **Assignment Management**: Create, update, delete, and retrieve assignments
- **File Uploads**: Support for assignment attachments and submission files
- **Submission Handling**: Student submission management with file and text support
- **Grading System**: Individual and bulk grading capabilities
- **Reminder System**: Automated notifications for assignment due dates
- **Queue Processing**: Async processing for notifications and reminders

### Technical Features
- RESTful API design
- JWT authentication and role-based authorization
- File storage integration with AWS S3
- Redis-based queue system for background tasks
- PostgreSQL database with Sequelize ORM
- Docker containerization
- Comprehensive error handling and logging

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **Cache/Queue**: Redis with Bull queue
- **File Storage**: AWS S3
- **Authentication**: JWT
- **Validation**: Joi
- **Container**: Docker & Docker Compose

## Database Schema

### Tables

#### `assignments`
- `id` (UUID, Primary Key)
- `title` (String, Required)
- `description` (Text)
- `course_id` (UUID, Required)
- `teacher_id` (UUID, Required)
- `due_date` (DateTime, Required)
- `max_score` (Integer, Default: 100)
- `is_active` (Boolean, Default: true)
- `instructions` (Text)
- `submission_type` (Enum: 'file', 'text', 'both')
- `allow_late_submission` (Boolean, Default: false)

#### `submissions`
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key)
- `student_id` (UUID, Required)
- `submitted_at` (DateTime)
- `text_submission` (Text)
- `score` (Float)
- `feedback` (Text)
- `graded_at` (DateTime)
- `graded_by` (UUID)
- `status` (Enum: 'submitted', 'graded', 'late', 'resubmitted')
- `is_late_submission` (Boolean)
- `submission_number` (Integer)

#### `assignment_attachments`
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key)
- `file_name` (String)
- `file_url` (String)
- `file_size` (Integer)
- `mime_type` (String)

#### `submission_files`
- `id` (UUID, Primary Key)
- `submission_id` (UUID, Foreign Key)
- `file_name` (String)
- `file_url` (String)
- `file_size` (Integer)
- `mime_type` (String)

## API Endpoints

### Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Assignments

#### Create Assignment
```http
POST /api/assignments
Content-Type: multipart/form-data
Authorization: Bearer <token>
Role: teacher
```

#### Get Assignments
```http
GET /api/assignments
Authorization: Bearer <token>
Role: student, teacher
```

#### Get Assignment by ID
```http
GET /api/assignments/:id
Authorization: Bearer <token>
Role: student, teacher
```

#### Update Assignment
```http
PUT /api/assignments/:id
Authorization: Bearer <token>
Role: teacher (own assignments only)
```

#### Delete Assignment
```http
DELETE /api/assignments/:id
Authorization: Bearer <token>
Role: teacher (own assignments only)
```

### Submissions

#### Create Submission
```http
POST /api/submissions/assignment/:assignmentId
Authorization: Bearer <token>
Role: student
```

#### Get Submissions
```http
GET /api/submissions
Authorization: Bearer <token>
Role: student, teacher
```

#### Grade Submission
```http
POST /api/submissions/:id/grade
Authorization: Bearer <token>
Role: teacher
```

#### Bulk Grade Submissions
```http
POST /api/submissions/grade/bulk
Authorization: Bearer <token>
Role: teacher
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Docker & Docker Compose (optional)

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   # Create database
   createdb assignment_service_db

   # Run migrations
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Docker Development

1. **Start services**:
   ```bash
   # Create external network
   docker network create eduhub-network

   # Start all services
   docker-compose up -d
   ```

2. **Run database migrations**:
   ```bash
   docker-compose exec assignment-service npm run db:migrate
   ```

## Queue Processing

The service uses Redis-based queues for:

### Reminder Queue
- **Due Soon**: 24 hours before due date
- **Due Today**: 1 hour before due date
- **Overdue**: 1 hour after due date

### Notification Queue
- Assignment created notifications
- Submission received notifications
- Grade notifications

### Scheduled Tasks
- **Daily at 8:00 AM**: Schedule reminders for assignments due tomorrow
- **Daily at 2:00 AM**: Clean up completed jobs
- **Every 6 hours**: Health check

## File Upload

### Supported File Types
- Documents: PDF, DOC, DOCX, TXT
- Images: JPG, PNG
- Maximum size: 10MB per file

## Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=assignment_service_db
DB_USER=postgres
DB_PASSWORD=password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=eduhub-assignments

# External Service URLs
AUTH_SERVICE_URL=http://auth-service:3000
NOTIFICATION_SERVICE_URL=http://notification-service:3000

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,png
```

## License

MIT License