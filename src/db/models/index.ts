import { getSequelize } from "../connection";
import { Device, initDeviceModel } from "./device.model";

let initialized = false;

export function initModels(): { Device: typeof Device } {
  if (!initialized) {
    const sequelize = getSequelize();
    initDeviceModel(sequelize);
    initialized = true;
  }
  return { Device };
}
