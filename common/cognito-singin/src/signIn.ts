import {
  CognitoIdentityClient, GetIdCommand, GetIdentityPoolRolesCommand, GetOpenIdTokenCommand,
} from '@aws-sdk/client-cognito-identity';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AssumeRoleWithWebIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import fetch from 'cross-fetch';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

import { SignInParam, SimpleLogger } from './types';

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

type SigninResult = GetCredentialsResult;

export const cognitoSignInClient = (initParam: { logger?: SimpleLogger }) => {
  const logger = initParam.logger || console;
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
    const json = await resp.json() as Promise<{
      id_token: string,
      access_token: string,
      refresh_token: string,
      expires_in: number,
      token_type: string,
    }>;

    return {
      idToken: (await json).id_token,
      accessToken: (await json).access_token,
      refreshToken: (await json).refresh_token,
      expiresIn: (await json).expires_in,
      tokenType: (await json).token_type,
    };
  };

  const getId = async (
    client: CognitoIdentityClient,
    param: GetIdParam,
  ): Promise<string> => {
    const { identityProvider, idToken } = param;
    const logins = { [identityProvider]: idToken };
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

    const result = res.AuthenticationResult!;

    return {
      idToken: result.IdToken!,
      accessToken: result.AccessToken!,
      refreshToken: result.RefreshToken!,
      expiresIn: result.ExpiresIn!,
      tokenType: result.TokenType!,
    };
  };

  const getDefaultRoles = async (
    client: CognitoIdentityClient,
    param: {
      idPoolId: string,
    },
  ) => client.send(new GetIdentityPoolRolesCommand({
    IdentityPoolId: param.idPoolId,
  }));

  const getOpenIDToken = async (
    client: CognitoIdentityClient,
    param: {
      identityId: string,
      identityProvider: string,
      idToken: string,
    },
  ) => {
    const { identityProvider, idToken } = param;
    const logins = { [identityProvider]: idToken };

    return client.send(new GetOpenIdTokenCommand({
      IdentityId: param.identityId,
      Logins: logins,
    }));
  };

  const assumeRoleWithWebIdentity = async (
    client: STSClient,
    param: {
      token: string,
      roleArn: string,
      roleSessionName: string,
      sessionDuration?: number,
    },
  ) => {
    const request = new AssumeRoleWithWebIdentityCommand({
      WebIdentityToken: param.token,
      RoleArn: param.roleArn,
      RoleSessionName: param.roleSessionName,
      DurationSeconds: param.sessionDuration,
    });
    return client.send(request);
  };

  const getCredentials = async (
    identityClient: CognitoIdentityClient,
    param: GetCredentialsParam,
  ): Promise<GetCredentialsResult> => {
    const {
      identityProvider, idPoolId, clientId, refreshToken,
    } = param;
    const idpClient = new CognitoIdentityProviderClient({});

    const initiateAuthResp = await initiateAuth(
      idpClient,
      {
        clientId,
        refreshToken,
      },
    );

    const { idToken } = initiateAuthResp;
    const tokenExpiration = initiateAuthResp.expiresIn;

    const identityId = await getId(
      identityClient,
      {
        identityProvider,
        idPoolId,
        idToken,
      },
    );

    const payload = jwt.decode(idToken) as { [key: string]: string | string[] };
    const preferredRole = payload['cognito:preferred_role'] as string;
    const username = payload['cognito:username'] as string;
    const { email } = payload;
    logger.debug(`JWT: ${JSON.stringify(payload)}`);

    const roleArn = preferredRole !== undefined
      ? preferredRole
      : (await getDefaultRoles(identityClient, { idPoolId })).Roles?.authenticated;

    logger.debug(`role arn: ${roleArn}`);
    try {
      const openIdToken = await getOpenIDToken(identityClient, {
        identityId,
        identityProvider,
        idToken,
      });

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
      logger.error(JSON.stringify(e));

      throw e;
    }
  };

  const signIn = async (param: SignInParam): Promise<SigninResult> => {
    const {
      domain, userPoolId, region, clientId, redirectUri, code, idPoolId, identityProvider,
    } = param;
    const {
      refreshToken,
    } = param;
    const identityClient = new CognitoIdentityClient({});

    if (refreshToken && refreshToken.length > 0) {
      return getCredentials(identityClient, {
        userPoolId,
        idPoolId,
        identityProvider,
        clientId,
        refreshToken,
      });
    }

    if (!code) {
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

    const oauthToken = await getOAuthToken({
      domain,
      clientId,
      redirectUri,
      code,
    });

    const client = jwksClient({
      jwksUri:
        `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
    });

    const getKey = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
      if (!header.kid) throw new Error('not found kid!');
      client.getSigningKey(header.kid, (err, key) => {
        if (err) throw err;
        callback(null, key?.getPublicKey());
      });
    };

    const { idToken } = oauthToken;
    const tokenExpiration = oauthToken.expiresIn;

    jwt.verify(idToken, getKey, (err, decoded) => {
      if (err) throw err;
      logger.error(decoded ? JSON.stringify(decoded) : 'undefined');
    });

    const identityId = await getId(
      identityClient,
      {
        idPoolId,
        identityProvider,
        idToken,
      },
    );

    const payload = jwt.decode(idToken) as { [key: string]: string | string[] };
    const preferredRole = payload['cognito:preferred_role'] as string;
    const username = payload['cognito:username'] as string;
    const { email } = payload;
    logger.debug(`JWT: ${JSON.stringify(payload)}`);

    const roleArn = preferredRole || (await getDefaultRoles(identityClient, { idPoolId })).Roles?.authenticated;

    logger.debug(`role arn: ${roleArn}`);
    try {
      const openIdToken = await getOpenIDToken(identityClient, {
        identityId,
        identityProvider,
        idToken,
      });

      const credentials = await assumeRoleWithWebIdentity(new STSClient({}), {
        token: openIdToken.Token!,
        roleArn: roleArn!,
        roleSessionName: email ? `${email}` : username,
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
      logger.error(JSON.stringify(e));

      throw e;
    }
  };
  return { signIn };
};

export default cognitoSignInClient;
