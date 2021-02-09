import { CognitoIdentityClient, GetCredentialsForIdentityCommand, GetIdCommand } from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import fetch from 'node-fetch';

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

  interface GetCredentialsParam {
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
    clientId: string,
    identityProvider: string,
    idPoolId: string,
    redirectUri: string,
    code?: string,
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

const getCredentialsForIdentity = async (
  client: CognitoIdentityClient,
  param: GetCredentialsForIdentityParam,
) => {
  const IdentityId = param.identityId;

  const Logins: {
      [key: string]: string
    } = [{
      key: param.identityProvider,
      value: param.idToken,
    }].map((entry) => {
      const entity: { [key: string]: string } = {};
      entity[entry.key] = entry.value;
      return entity;
    }).reduce((cur, acc) => Object.assign(acc, cur));

  const req = new GetCredentialsForIdentityCommand({
    IdentityId,
    Logins,
  });

  return client.send(req);
};

const getCredentials = async (
  idpClient: CognitoIdentityClient,
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
  try {
    identityId = await getId(
      idpClient,
      {
        identityProvider,
        idPoolId,
        idToken,
      },
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.info(e);

    const idProvider = new CognitoIdentityProviderClient({});
    const initiateAuthResp = await initiateAuth(
      idProvider,
      {
        clientId,
        refreshToken,
      },
    );

    idToken = initiateAuthResp.idToken;
    tokenExpiration = initiateAuthResp.expiresIn;

    identityId = await getId(
      idpClient,
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
  }

  try {
    const credentials = await getCredentialsForIdentity(
      idpClient, {
        identityId,
        identityProvider,
        idToken,
      },
    );

    return {
      accessKeyId: credentials.Credentials?.AccessKeyId,
      secretKey: credentials.Credentials?.SecretKey,
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
  const idpClient = new CognitoIdentityClient({});

  if (code !== undefined) {
    const currentSession = await getOAuthToken({
      domain,
      clientId,
      redirectUri,
      code,
    });

    // console.log(`OAuthTokens: ${JSON.stringify(currentSession)}`);

    return getCredentials(idpClient, {
      idPoolId: param.idPoolId,
      identityProvider: param.identityProvider,
      clientId: param.clientId,
      idToken: currentSession.idToken,
      refreshToken: currentSession.refreshToken,
    });
  }

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
};

export default signIn;
