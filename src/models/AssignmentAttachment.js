module.exports = (sequelize, DataTypes) => {
  const AssignmentAttachment = sequelize.define('AssignmentAttachment', {
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
    tableName: 'assignment_attachments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['assignment_id'],
      },
    ],
  });

  AssignmentAttachment.associate = (models) => {
    AssignmentAttachment.belongsTo(models.Assignment, {
      foreignKey: 'assignmentId',
      as: 'assignment',
    });
  };

  return AssignmentAttachment;
};