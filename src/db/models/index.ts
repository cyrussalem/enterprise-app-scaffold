import { getSequelize } from "../connection";
import { Device, initDeviceModel } from "./device.model";
import { TelemetryReading, initTelemetryReadingModel } from "./telemetry-reading.model";
import { UserProfile, initUserProfileModel } from "./user-profile.model";

let initialized = false;

export function initModels(): {
  Device: typeof Device;
  TelemetryReading: typeof TelemetryReading;
  UserProfile: typeof UserProfile;
} {
  if (!initialized) {
    const sequelize = getSequelize();
    initDeviceModel(sequelize);
    initTelemetryReadingModel(sequelize);
    initUserProfileModel(sequelize);
    initialized = true;
  }
  return { Device, TelemetryReading, UserProfile };
}
