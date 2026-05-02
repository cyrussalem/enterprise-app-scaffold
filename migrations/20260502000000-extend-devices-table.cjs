"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("devices", "serial_number", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "manufacturer", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "model", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `CREATE TYPE "enum_devices_device_type" AS ENUM ('sensor', 'tracker', 'meter', 'actuator', 'gateway')`
    );
    await queryInterface.addColumn("devices", "device_type", {
      type: Sequelize.ENUM("sensor", "tracker", "meter", "actuator", "gateway"),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "tags", {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: true,
      defaultValue: [],
    });
    await queryInterface.addColumn("devices", "last_seen_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "ip_address", {
      type: Sequelize.STRING(45),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "signal_strength", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "latitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "longitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "location_label", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "timezone", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "firmware_version", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "hardware_revision", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "last_ota_update_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "battery_level", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "uptime_seconds", {
      type: Sequelize.BIGINT,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "error_count", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn("devices", "device_temperature", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "polling_interval_seconds", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 60,
    });
    await queryInterface.addColumn("devices", "alert_threshold_config", {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn("devices", "user_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const columns = [
      "serial_number",
      "manufacturer",
      "model",
      "device_type",
      "tags",
      "last_seen_at",
      "ip_address",
      "signal_strength",
      "latitude",
      "longitude",
      "location_label",
      "timezone",
      "firmware_version",
      "hardware_revision",
      "last_ota_update_at",
      "battery_level",
      "uptime_seconds",
      "error_count",
      "device_temperature",
      "polling_interval_seconds",
      "alert_threshold_config",
      "user_id",
    ];
    for (const col of columns) {
      await queryInterface.removeColumn("devices", col);
    }
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_devices_device_type"`
    );
  },
};
