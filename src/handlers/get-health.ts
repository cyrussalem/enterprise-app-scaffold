import type { APIGatewayProxyResult } from "aws-lambda";
import { initModels } from "../db/models";

export const handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const { Device } = initModels();
    const devices = await Device.findAll();

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "success",
        devices,
      }),
    };
  } catch (error) {
    console.error("Health check failed:", error);
    return {
      statusCode: 503,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ok: false,
        message: "database connection failed",
      }),
    };
  }
};
