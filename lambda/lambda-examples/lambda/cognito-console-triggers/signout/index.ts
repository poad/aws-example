import { CognitoIdentityProviderClient, GlobalSignOutCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

interface EnvironmentVariables {
    clientId: string,
}

export const environments: EnvironmentVariables = {
  clientId: process.env.CLIENT_ID!,
};

interface Session {
    refreshToken?: string,
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const { refreshToken } = event.cookies !== undefined && event.cookies.length > 0
    ? JSON.parse(event.cookies[0]) as Session : { refreshToken: undefined };

  if (refreshToken !== undefined) {
    try {
      const identityProviderCleint = new CognitoIdentityProviderClient({});
      const { AuthenticationResult } = await identityProviderCleint.send(new InitiateAuthCommand({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
        ClientId: environments.clientId,
      }));

      if (AuthenticationResult?.AccessToken !== undefined) {
        await identityProviderCleint.send(new GlobalSignOutCommand({
          AccessToken: AuthenticationResult!.AccessToken!,
        }));
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  return {
    cookies: [],
    statusCode: 204,
  };
};
