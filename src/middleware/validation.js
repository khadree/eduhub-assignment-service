const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message),
      });
    }
    req.body = value;
    next();
  };
};

const assignmentSchema = Joi.object({
  title: Joi.string().required().min(1).max(255),
  description: Joi.string().optional(),
  courseId: Joi.string().uuid().required(),
  dueDate: Joi.date().iso().required(),
  maxScore: Joi.number().integer().min(0).optional().default(100),
  instructions: Joi.string().optional(),
  submissionType: Joi.string().valid('file', 'text', 'both').optional().default('file'),
  allowLateSubmission: Joi.boolean().optional().default(false),
});

const updateAssignmentSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional(),
  dueDate: Joi.date().iso().optional(),
  maxScore: Joi.number().integer().min(0).optional(),
  instructions: Joi.string().optional(),
  submissionType: Joi.string().valid('file', 'text', 'both').optional(),
  allowLateSubmission: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

const submissionSchema = Joi.object({
  textSubmission: Joi.string().optional(),
}).unknown(true);

const gradeSchema = Joi.object({
  score: Joi.number().min(0).required(),
  feedback: Joi.string().optional(),
});

module.exports = {
  validate,
  assignmentSchema,
  updateAssignmentSchema,
  submissionSchema,
  gradeSchema,
};