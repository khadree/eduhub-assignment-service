module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('assignments', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      max_score: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 100,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      attachment_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      instructions: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submission_type: {
        type: Sequelize.ENUM('file', 'text', 'both'),
        defaultValue: 'file',
      },
      allow_late_submission: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
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

    await queryInterface.addIndex('assignments', ['course_id']);
    await queryInterface.addIndex('assignments', ['teacher_id']);
    await queryInterface.addIndex('assignments', ['due_date']);
    await queryInterface.addIndex('assignments', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('assignments');
  }
};