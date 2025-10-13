module.exports = (sequelize, DataTypes) => {
  const SubmissionFile = sequelize.define('SubmissionFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    submissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'submission_id',
      references: {
        model: 'submissions',
        key: 'id',
      },
    },
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_name',
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'file_url',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'file_size',
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'mime_type',
    },
    uploadedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'uploaded_at',
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
    tableName: 'submission_files',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['submission_id'],
      },
    ],
  });

  SubmissionFile.associate = (models) => {
    SubmissionFile.belongsTo(models.Submission, {
      foreignKey: 'submissionId',
      as: 'submission',
    });
  };

  return SubmissionFile;
};