import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

interface EnvironmentVariables {
    clientId: string,
}

export const environments: EnvironmentVariables = {
  clientId: process.env.CLIENT_ID!,
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  console.trace(JSON.stringify(event));

  if (event.headers.authorization !== undefined) {
    const bearerToken = event.headers.authorization.split(' ');
    if (bearerToken.length === 2) {
      const accessToken = bearerToken[1];

      try {
        const identityProviderCleint = new CognitoIdentityProviderClient({});
        const response = await identityProviderCleint.send(new GetUserCommand({
          AccessToken: accessToken,
        }));
        return {
          cookies: [],
          statusCode: 200,
          body: JSON.stringify(response),
        };
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.warn('unauthorized');

  return {
    cookies: [],
    statusCode: 401,
  };
};
