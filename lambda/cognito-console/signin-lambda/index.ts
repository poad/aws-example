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

interface Session {
  idToken: string | undefined,
  refreshToken: string | undefined,
  expiration: number | undefined,
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

    if (event.pathParameters?.proxy === 'favicon.ico') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const cookie = event.cookies !== undefined
      ? JSON.parse(event.cookies[0])
      : { session: undefined };

    const code = event.queryStringParameters?.code !== undefined
      ? event.queryStringParameters.code : cookie?.code;
    const session: Session = cookie.session !== undefined
      ? cookie.session : {
        idToken: undefined,
        refreshToken: undefined,
        expiration: undefined,
      };

    const {
      domain,
      clientId,
      idPoolId,
      identityProvider,
      region,
    } = environments;

    const { idToken, refreshToken } = session?.expiration !== undefined
        && session?.expiration > new Date().getTime()
      ? session : { idToken: undefined, refreshToken: undefined };

    if (code === undefined && (idToken === undefined || refreshToken === undefined)) {
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
      accessKeyId, secretKey, sessionToken, tokens,
    } = await signIn({
      domain,
      clientId,
      redirectUri,
      idPoolId,
      identityProvider,
      code,
      idToken,
      refreshToken,
      expireIn: session?.expiration,
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

    const issuer = `https://${domain}.auth.${region}.amazoncognito.com/login?response_type=code&client_id=${clientId}&redirect_uri=${environments.apiUrl}/index.html&scope=openid+profile+aws.cognito.signin.user.admin`;
    const destUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent('https://console.aws.amazon.com/')}&SigninToken=${signInToken}&Issuer=${encodeURIComponent(issuer)}`;
    // const destUrl = `https://signin.aws.amazon.com/federation?Action=login&Destination=${encodeURIComponent('https://console.aws.amazon.com/')}&SigninToken=${signInToken}`;
    return {
      cookies: [
        JSON.stringify({
          session: tokens as Session,
        }),
      ],
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
