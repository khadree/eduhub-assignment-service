module.exports = (sequelize, DataTypes) => {
  const Assignment = sequelize.define('Assignment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'course_id',
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'teacher_id',
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'due_date',
    },
    maxScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 100,
      field: 'max_score',
      validate: {
        min: 0,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active',
    },
    attachmentUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'attachment_url',
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submissionType: {
      type: DataTypes.ENUM('file', 'text', 'both'),
      defaultValue: 'file',
      field: 'submission_type',
    },
    allowLateSubmission: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'allow_late_submission',
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
    tableName: 'assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['course_id'],
      },
      {
        fields: ['teacher_id'],
      },
      {
        fields: ['due_date'],
      },
      {
        fields: ['is_active'],
      },
    ],
  });

  Assignment.associate = (models) => {
    Assignment.hasMany(models.Submission, {
      foreignKey: 'assignmentId',
      as: 'submissions',
    });

    Assignment.hasMany(models.AssignmentAttachment, {
      foreignKey: 'assignmentId',
      as: 'attachments',
    });
  };

  return Assignment;
};