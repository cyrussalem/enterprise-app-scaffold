"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("telemetry_readings", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "devices",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      metric: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      value: {
        type: Sequelize.DOUBLE,
        allowNull: false,
      },
      unit: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex("telemetry_readings", ["device_id", "recorded_at"], {
      name: "idx_telemetry_device_recorded",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("telemetry_readings");
  },
};
