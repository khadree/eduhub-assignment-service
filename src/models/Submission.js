module.exports = (sequelize, DataTypes) => {
  const Submission = sequelize.define('Submission', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    assignmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'assignment_id',
      references: {
        model: 'assignments',
        key: 'id',
      },
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'student_id',
    },
    submittedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'submitted_at',
    },
    textSubmission: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'text_submission',
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_url',
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'file_name',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size',
    },
    score: {
      type: DataTypes.FLOAT,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    gradedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'graded_at',
    },
    gradedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'graded_by',
    },
    status: {
      type: DataTypes.ENUM('submitted', 'graded', 'late', 'resubmitted'),
      defaultValue: 'submitted',
    },
    isLateSubmission: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_late_submission',
    },
    submissionNumber: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'submission_number',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  }, {
    tableName: 'submissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['assignment_id'],
      },
      {
        fields: ['student_id'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['submitted_at'],
      },
      {
        unique: true,
        fields: ['assignment_id', 'student_id', 'submission_number'],
      },
    ],
  });

  Submission.associate = (models) => {
    Submission.belongsTo(models.Assignment, {
      foreignKey: 'assignmentId',
      as: 'assignment',
    });

    Submission.hasMany(models.SubmissionFile, {
      foreignKey: 'submissionId',
      as: 'files',
    });
  };

  return Submission;
};