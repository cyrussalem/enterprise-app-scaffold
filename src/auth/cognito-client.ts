import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";

let client: CognitoIdentityProviderClient | null = null;

export function getCognitoClient(): CognitoIdentityProviderClient {
  if (!client) {
    const endpoint = process.env.COGNITO_ENDPOINT || undefined;
    client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION ?? "us-east-1",
      endpoint,
      // When pointed at a local emulator, the SDK still signs requests, so
      // we supply dummy credentials to prevent it from hanging on the default
      // credential provider chain.
      ...(endpoint
        ? {
            credentials: {
              accessKeyId: "local",
              secretAccessKey: "local",
            },
          }
        : {}),
    });
  }
  return client;
}

export function resetCognitoClient(): void {
  client = null;
}
