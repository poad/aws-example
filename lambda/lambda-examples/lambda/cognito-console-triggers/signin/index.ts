import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import fetch from 'cross-fetch';
import signIn from './signIn';

interface EnvironmentVariables {
  domain: string,
  region: string,
  userPoolId: string,
  clientId: string,
  idPoolId: string,
  identityProvider: string,
  apiUrl: string,
}

export const environments: EnvironmentVariables = {
  domain: process.env.DOMAIN!,
  region: process.env.REGION!,
  userPoolId: process.env.USER_POOL_ID!,
  clientId: process.env.CLIENT_ID!,
  idPoolId: process.env.ID_POOL_ID!,
  identityProvider: process.env.IDENTITY_PROVIDER!,
  apiUrl: process.env.API_URL!,
};

interface Session {
  refreshToken?: string,
}

const getSignInToken = async (
  param: {
    accessKeyId: string,
    secretKey: string,
    sessionToken: string,
  },
) => {
  const resp = await fetch(
    `https://signin.aws.amazon.com/federation?Action=getSigninToken&SessionType=json&Session=${encodeURIComponent(JSON.stringify({
      sessionId: param.accessKeyId,
      sessionKey: param.secretKey,
      sessionToken: param.sessionToken,
    }))}`,
    {
      redirect: 'follow',
    },
  );
  return resp.json();
};

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    // eslint-disable-next-line no-console
    console.log('request:', JSON.stringify(event, undefined, 2));

    const { rawPath } = event;

    if (rawPath === '/favicon.ico') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const code = event.queryStringParameters?.code;

    const { domain, clientId, region } = environments;
    const { domainName, http } = event.requestContext;

    if (code === undefined) {
      const redirectUri = `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=code&client_id=${clientId}&redirect_uri=https://${domainName}${rawPath}`;
      return {
        cookies: [],
        statusCode: 308,
        headers: { Location: redirectUri },
      };
    }

    const redirectUri = `https://${domainName}${http.path}`;

    const { refreshToken } = event.cookies !== undefined && event.cookies.length > 0
      ? JSON.parse(event.cookies[0]) as Session : { refreshToken: undefined };

    try {
      const {
        accessKeyId, secretKey, sessionToken, tokens,
      } = await signIn({
        domain,
        userPoolId: environments.userPoolId,
        clientId,
        redirectUri,
        idPoolId: environments.idPoolId,
        identityProvider: environments.identityProvider,
        code,
        refreshToken,
      });

      if (accessKeyId === undefined
        || secretKey === undefined
        || sessionToken === undefined) {
        // eslint-disable-next-line no-console
        console.error('Credentials are empty');
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'text/plain' },
        };
      }

      const { SigninToken } = await getSignInToken({ accessKeyId, secretKey, sessionToken });

      const issuer = environments.apiUrl;
      const destUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent('https://console.aws.amazon.com/')}&SigninToken=${SigninToken}&Issuer=${encodeURIComponent(issuer)}`;
      return {
        statusCode: 308,
        headers: {
          Location: destUrl,
        },
        cookies: [JSON.stringify({ refreshToken: tokens.refreshToken } as Session)],
      };
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);

      return {
        cookies: [],
        statusCode: 308,
        headers: { Location: `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=code&client_id=${clientId}&redirect_uri=https://${domainName}${rawPath}` },
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    throw e;
  }
};

export default handler;
