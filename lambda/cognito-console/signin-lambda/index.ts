import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import fetch from 'node-fetch';
import signIn from './signIn';

interface EnvironmentVariables {
  domain: string,
  region: string,
  clientId: string,
  idPoolId: string,
  identityProvider: string,
  apiUrl: string,
}

export const environments: EnvironmentVariables = {
  domain: process.env.DOMAIN!,
  region: process.env.REGION!,
  clientId: process.env.CLIENT_ID!,
  idPoolId: process.env.ID_POOL_ID!,
  identityProvider: process.env.IDENTITY_PROVIDER!,
  apiUrl: process.env.API_URL!,
};

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

    if (event.pathParameters?.proxy === 'favicon.ico') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const code = event.queryStringParameters?.code;
    
    const {
      domain,
      clientId,
      idPoolId,
      identityProvider,
      region,
    } = environments;

    if (code === undefined) {
      const redirectUri = `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=code&client_id=${clientId}&redirect_uri=https://${event.requestContext.domainName}${event.rawPath}`;
      return {
        cookies: [],
        statusCode: 308,
        headers: { Location: redirectUri },
      };
    }

    const context = event.requestContext;

    const redirectUri = `https://${context.domainName}${context.http.path}`;

    const {
      accessKeyId, secretKey, sessionToken,
    } = await signIn({
      domain,
      clientId,
      redirectUri,
      idPoolId,
      identityProvider,
      code,
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

    const getSignInTokenResp = await getSignInToken({
      accessKeyId,
      secretKey,
      sessionToken,
    });

    const signInToken = getSignInTokenResp.SigninToken;

    // const issuer = `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=code&client_id=${clientId}&redirect_uri=${environments.apiUrl}/&scope=openid+profile+aws.cognito.signin.user.admin`;
    // const destUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent('https://console.aws.amazon.com/')}&SigninToken=${signInToken}`;
    const issuer = environments.apiUrl;
    const destUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent('https://console.aws.amazon.com/')}&SigninToken=${signInToken}&Issuer=${encodeURIComponent(issuer)}`;
    return {
      statusCode: 308,
      headers: {
        Location: destUrl,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    throw e;
  }
};

export default handler;
