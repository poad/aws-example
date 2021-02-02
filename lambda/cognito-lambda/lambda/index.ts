import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import fetch from 'node-fetch';
import { Readable } from 'stream';

interface EnvironmentVariables {
  domain: string,
  clientId: string,
  idPoolId: string,
  identityProvider: string,
  s3Region: string,
  bucket: string,
}

export const environments: EnvironmentVariables = {
  domain: process.env.DOMAIN!,
  clientId: process.env.CLIENT_ID!,
  idPoolId: process.env.ID_POOL_ID!,
  identityProvider: process.env.IDENTITY_PROVIDER!,
  s3Region: process.env.S3_REGION!,
  bucket: process.env.S3_BUCKET!,
};

interface TokenAuthParam {
  domain: string,
  clientId: string,
  redirectUri: string,
  code: string,
}

interface GetIdParam {
  identityProvider: string,
  idPoolId: string,
  idToken: string,
}

interface InitiateAuthParam {
  clientId: string,
  refreshToken: string,
}

interface GetCredentialsForIdentityParam {
  identityId: string,
  identityProvider: string,
  idToken: string,
}

interface SignInParam {
  domain: string,
  clientId: string,
  identityProvider: string,
  idPoolId: string,
  redirectUri: string,
  code?: string,
  idToken?: string,
  refreshToken?: string,
  expireIn?: number
}

const tokenAuth = async (param: TokenAuthParam): Promise<{
  idToken: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  tokenType: string,
}> => {
  const body = Object.entries({
    grant_type: 'authorization_code',
    client_id: param.clientId,
    code: param.code,
    redirect_uri: param.redirectUri,
  } as {
    [key: string]: string
  })
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .reduce((cur, acc) => `${acc}&${cur}`);

  const authUri = `https://${param.domain}.auth.us-west-2.amazoncognito.com/oauth2/token`;

  const resp = await fetch(authUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: 'follow',
    body,
  });
  const json = await resp.json();

  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in,
    tokenType: json.token_type,
  };
};

const getId = async (
  client: CognitoIdentityClient,
  param: GetIdParam,
): Promise<string> => {
  const logins: {
    [key: string]: string
  } = [{
    key: param.identityProvider,
    value: param.idToken,
  }].map((entry) => {
    const entity: {[key: string]: string} = {};
    entity[entry.key] = entry.value;
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur));

  const req = new GetIdCommand({
    IdentityPoolId: param.idPoolId,
    Logins: logins,
  });

  const resp = await client.send(req);
  return resp.IdentityId!;
};

const initiateAuth = async (
  idProvider: CognitoIdentityProviderClient,
  param: InitiateAuthParam,
): Promise<{
  idToken: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  tokenType: string,
}> => {
  const res = await idProvider.send(new InitiateAuthCommand({
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    AuthParameters: {
      REFRESH_TOKEN: param.refreshToken,
    },
    ClientId: param.clientId,
  }));

  return {
    idToken: res.AuthenticationResult!.IdToken!,
    accessToken: res.AuthenticationResult!.AccessToken!,
    refreshToken: res.AuthenticationResult!.RefreshToken!,
    expiresIn: res.AuthenticationResult!.ExpiresIn!,
    tokenType: res.AuthenticationResult!.TokenType!,
  };
};

const getCredentialsForIdentity = async (
  client: CognitoIdentityClient,
  param: GetCredentialsForIdentityParam,
) => {
  const logins: {
    [key: string]: string
  } = [{
    key: param.identityProvider,
    value: param.idToken,
  }].map((entry) => {
    const entity: {[key: string]: string} = {};
    entity[entry.key] = entry.value;
    return entity;
  }).reduce((cur, acc) => Object.assign(acc, cur));

  const req = new GetCredentialsForIdentityCommand({
    IdentityId: param.identityId,
    Logins: logins,
  });

  const resp = await client.send(req);
  return resp;
};

const signIn = async (param: SignInParam): Promise<{
  accessKeyId: string | undefined,
  secretKey: string | undefined,
  sessionToken: string | undefined,
  expiration: Date | undefined,
  tokens: {
    idToken: string | undefined,
    refreshToken: string | undefined,
    epiration: number | undefined,
  }
}> => {
  const { identityProvider } = param;

  const idpClient = new CognitoIdentityClient({});

  const currentSession = param.code !== undefined ? await tokenAuth({
    domain: param.domain,
    clientId: param.clientId,
    redirectUri: param.redirectUri,
    code: param.code,
  }) : { idToken: param.idToken!, refreshToken: param.refreshToken!, expiresIn: param.expireIn! };

  let { idToken } = currentSession;
  const { expiresIn, refreshToken } = currentSession;
  let tokenExpiration = expiresIn;
  let identityId;
  try {
    identityId = await getId(
      idpClient,
      {
        identityProvider,
        idPoolId: param.idPoolId,
        idToken,
      },
    );
  } catch (e) {
    const idProvider = new CognitoIdentityProviderClient({});
    const initiateAuthResp = await initiateAuth(
      idProvider,
      {
        clientId: param.clientId,
        refreshToken,
      },
    );
    idToken = initiateAuthResp.idToken;
    tokenExpiration = initiateAuthResp.expiresIn;

    identityId = await getId(
      idpClient,
      {
        identityProvider,
        idPoolId: param.idPoolId,
        idToken,
      },
    );
  }
  const credentials = await getCredentialsForIdentity(idpClient, {
    identityId,
    identityProvider,
    idToken,
  });

  return {
    accessKeyId: credentials.Credentials?.AccessKeyId,
    secretKey: credentials.Credentials?.SecretKey,
    sessionToken: credentials.Credentials?.SessionToken,
    expiration: credentials.Credentials?.Expiration,
    tokens: {
      idToken,
      refreshToken,
      epiration: tokenExpiration,
    },
  };
};

// Convert readable streams.
async function* yieldUint8Chunks(reader: Readable): AsyncGenerator<string | undefined> {
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    if (done) return;
    yield value;
  }
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
  // eslint-disable-next-line no-console
    console.log('request:', JSON.stringify(event, undefined, 2));

    const pathParameters = event.pathParameters || { proxy: undefined };
    const { proxy } = pathParameters;
    if (proxy === 'favicon.ico') {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const cookie = event.cookies !== undefined
      ? JSON.parse(event.cookies[0])
      : { session: undefined };
    const queryStringParameters = event.queryStringParameters || { code: undefined };
    const code = queryStringParameters.code !== undefined
      ? queryStringParameters.code : cookie?.code;
    const session = cookie.session !== undefined
      ? cookie.session : {
        idToken: undefined,
        refreshToken: undefined,
        expiration: undefined,
      };

    const { idToken, refreshToken } = session?.expiration < new Date().getTime()
      ? session : { idToken: undefined, refreshToken: undefined };
    if (code === undefined || idToken === undefined || refreshToken === undefined) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const state = queryStringParameters.state !== undefined
      ? queryStringParameters.state : undefined;

    const baseKey = state !== undefined ? Buffer.from(state).toString('utf-8') : cookie?.baseKey;

    const context = event.requestContext;

    const {
      domain,
      clientId,
      idPoolId,
      identityProvider,
    } = environments;

    const redirectUri = `https://${context.domainName}${context.http.path}`;

    const {
      accessKeyId, secretKey, sessionToken, expiration, tokens,
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
      console.error('Crredentials are empty');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'text/plain' },
      };
    }

    const s3 = new S3Client({
      region: environments.s3Region,
      credentials: {
        accessKeyId,
        secretAccessKey: secretKey,
        sessionToken,
        expiration,
      },
    });

    try {
      if (proxy?.endsWith('/')) {
        const resp = await s3.send(new ListObjectsV2Command({
          Bucket: environments.bucket,
          Prefix: proxy,
        }));
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resp.Contents!.map((content) => content.Key!)),
        };
      }
      const resp = await s3.send(new GetObjectCommand({
        Bucket: environments.bucket,
        Key: proxy,
      }));
      if (resp.Body === undefined) {
        // eslint-disable-next-line no-console
        console.warn('not found');

        return {
          statusCode: 404,
          headers: { 'Content-Type': 'text/plain' },
        };
      }

      let stringResult = '';
      // eslint-disable-next-line no-restricted-syntax
      for await (const chunk of yieldUint8Chunks(resp.Body as Readable)) {
        if (chunk !== undefined) {
          stringResult += chunk;
        }
      }
      const result = {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: stringResult,
      };

      if (proxy === 'index.html') {
        const cookies = [JSON.stringify({
          baseKey,
        })];
        return Object.assign(result, { cookies, session: tokens });
      }
      return result;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(e),
      };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    throw e;
  }
};

export default handler;
