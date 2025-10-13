module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('submissions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      assignment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'assignments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      submitted_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      text_submission: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      score: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      graded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      graded_by: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('submitted', 'graded', 'late', 'resubmitted'),
        defaultValue: 'submitted',
      },
      is_late_submission: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      submission_number: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('submissions', ['assignment_id']);
    await queryInterface.addIndex('submissions', ['student_id']);
    await queryInterface.addIndex('submissions', ['status']);
    await queryInterface.addIndex('submissions', ['submitted_at']);
    await queryInterface.addIndex('submissions', ['assignment_id', 'student_id', 'submission_number'], {
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('submissions');
  }
};