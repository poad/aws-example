import { CognitoIdentityClient, GetIdCommand, GetIdentityPoolRolesCommand, GetOpenIdTokenCommand } from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AssumeRoleWithWebIdentityCommand, STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import fetch from 'node-fetch';
import * as jwt from 'jsonwebtoken';

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

  interface GetCredentialsParam {
    userPoolId: string,
    idPoolId: string,
    clientId: string,
    identityProvider: string,
    idToken: string,
    refreshToken: string,
  }

  interface GetCredentialsResult {
    accessKeyId: string | undefined,
    secretKey: string | undefined,
    sessionToken: string | undefined,
    expiration: Date | undefined,
    tokens: {
      idToken: string | undefined,
      refreshToken: string | undefined,
      expiration: number | undefined,
    }
  }

  interface SignInParam {
    domain: string,
    userPoolId: string,
    clientId: string,
    identityProvider: string,
    idPoolId: string,
    redirectUri: string,
    code?: string,
    refreshToken?: string,
  }

export type SigninResult = GetCredentialsResult;

const getOAuthToken = async (param: TokenAuthParam): Promise<{
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
      const entity: { [key: string]: string } = {};
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

  // console.log(JSON.stringify(res));

  return {
    idToken: res.AuthenticationResult!.IdToken!,
    accessToken: res.AuthenticationResult!.AccessToken!,
    refreshToken: res.AuthenticationResult!.RefreshToken!,
    expiresIn: res.AuthenticationResult!.ExpiresIn!,
    tokenType: res.AuthenticationResult!.TokenType!,
  };
};

const getDefaultRoles = async (
  client: CognitoIdentityClient,
  param: {
    idPoolId: string,
  }
) => {
  return client.send(new GetIdentityPoolRolesCommand({
    IdentityPoolId: param.idPoolId,
  }));
}

const getOpenIDToken = async (
  client: CognitoIdentityClient,
  param: {
    identityId: string,
    identityProvider: string,
    idToken: string,
  }
) => {
  const logins: {
      [key: string]: string
    } = [{
      key: param.identityProvider,
      value: param.idToken,
    }].map((entry) => {
      const entity: { [key: string]: string } = {};
      entity[entry.key] = entry.value;
      return entity;
    }).reduce((cur, acc) => Object.assign(acc, cur));

  return client.send(new GetOpenIdTokenCommand({
    IdentityId: param.identityId,
    Logins: logins
  }));
}

const assumeRoleWithWebIdentity = async (
  client: STSClient,
  param: {
    token: string,
    roleArn: string,
    roleSessionName: string,
    sessionDuration?: number,
  }
) => {
  const request = new AssumeRoleWithWebIdentityCommand({
    WebIdentityToken: param.token,
    RoleArn: param.roleArn,
    RoleSessionName: param.roleSessionName,
    DurationSeconds: param.sessionDuration
  });
  const response = await client.send(request);
  await client.send(new AssumeRoleCommand({
    RoleArn: param.roleArn,
    RoleSessionName: param.roleSessionName,
    DurationSeconds: param.sessionDuration,
    Tags: [
      {
        Key: 'groups',
        Value: 'sub1'
      },
      {
        Key: 'groups',
        Value: 'sub2'
      }
    ],
    ExternalId: '',
  }));
  return response;
}

const getCredentials = async (
  identityClient: CognitoIdentityClient,
  param: GetCredentialsParam,
): Promise<GetCredentialsResult> => {
  let identityId;
  let {
    idToken,
  } = param;
  const {
    identityProvider, idPoolId, clientId, refreshToken,
  } = param;
  let tokenExpiration;
  const idpClient = new CognitoIdentityProviderClient({});

  const initiateAuthResp = await initiateAuth(
    idpClient,
    {
      clientId,
      refreshToken,
    },
  );

  idToken = initiateAuthResp.idToken;
  tokenExpiration = initiateAuthResp.expiresIn;

  identityId = await getId(
    identityClient,
    {
      identityProvider,
      idPoolId,
      idToken,
    },
  );

  // const user = await idProvider.send(new GetUserCommand({
  //   AccessToken: initiateAuthResp.idToken,
  // }));
  // console.log(`Uer Info: ${JSON.stringify(user)}`);

  const payload = jwt.decode(idToken) as { [key: string]: string | string[] };
  const preferredRole = payload['cognito:preferred_role'] as string;
  const username = payload['cognito:username'] as string;
  const email = payload.email;
  console.log(`JWT: ${JSON.stringify(payload)}`);

  const roleArn = preferredRole !== undefined
      ? preferredRole
      : (await getDefaultRoles(identityClient, { idPoolId })).Roles?.authenticated;

  console.log(`role arn: ${roleArn}`);
  try {
    const openIdToken = await getOpenIDToken(
      identityClient, {
        identityId,
        identityProvider,
        idToken,
      },
    );

    const credentials = await assumeRoleWithWebIdentity(new STSClient({}), {
      token: openIdToken.Token!,
      roleArn: roleArn!,
      roleSessionName: email !== undefined ? `${email}` : username,
    });

    return {
      accessKeyId: credentials.Credentials?.AccessKeyId,
      secretKey: credentials.Credentials?.SecretAccessKey,
      sessionToken: credentials.Credentials?.SessionToken,
      expiration: credentials.Credentials?.Expiration,
      tokens: {
        idToken,
        refreshToken,
        expiration: tokenExpiration,
      },
    };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);

    throw e;
  }
};

const signIn = async (param: SignInParam): Promise<SigninResult> => {
  const {
    domain, clientId, redirectUri, code,
  } = param;
  let {
    refreshToken,
  } = param;
  const identityClient = new CognitoIdentityClient({});
  const idpClient = new CognitoIdentityProviderClient({});

  let idToken;
  if (refreshToken !== undefined) {

    const initiateAuthResp = await initiateAuth(
      idpClient,
      {
        clientId,
        refreshToken,
      },
    );
    idToken = initiateAuthResp.idToken;
  }
  if (code !== undefined) {
    const currentSession = await getOAuthToken({
      domain,
      clientId,
      redirectUri,
      code,
    });
    idToken = currentSession.idToken;
    refreshToken = currentSession.refreshToken;
  }

  if (idToken === undefined || refreshToken === undefined) {
    return {
      accessKeyId: undefined,
      secretKey: undefined,
      sessionToken: undefined,
      expiration: undefined,
      tokens: {
        idToken: undefined,
        refreshToken: undefined,
        expiration: undefined,
      },
    };
  }

  // console.log(`OAuthTokens: ${JSON.stringify(currentSession)}`);
  return getCredentials(identityClient, {
    userPoolId: param.userPoolId,
    idPoolId: param.idPoolId,
    identityProvider: param.identityProvider,
    clientId: param.clientId,
    idToken,
    refreshToken: refreshToken,
  });
};

export default signIn;
