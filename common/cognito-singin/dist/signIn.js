"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cognitoSignInClient = void 0;
const client_cognito_identity_1 = require("@aws-sdk/client-cognito-identity");
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_sts_1 = require("@aws-sdk/client-sts");
const cross_fetch_1 = require("cross-fetch");
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const cognitoSignInClient = (initParam) => {
    const logger = initParam.logger || console;
    const getOAuthToken = async (param) => {
        const body = Object.entries({
            grant_type: 'authorization_code',
            client_id: param.clientId,
            code: param.code,
            redirect_uri: param.redirectUri,
        })
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .reduce((cur, acc) => `${acc}&${cur}`);
        const authUri = `https://${param.domain}.auth.us-west-2.amazoncognito.com/oauth2/token`;
        const resp = await (0, cross_fetch_1.default)(authUri, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow',
            body,
        });
        const json = await resp.json();
        return {
            idToken: (await json).id_token,
            accessToken: (await json).access_token,
            refreshToken: (await json).refresh_token,
            expiresIn: (await json).expires_in,
            tokenType: (await json).token_type,
        };
    };
    const getId = async (client, param) => {
        const { identityProvider, idToken } = param;
        const logins = { [identityProvider]: idToken };
        const req = new client_cognito_identity_1.GetIdCommand({
            IdentityPoolId: param.idPoolId,
            Logins: logins,
        });
        const resp = await client.send(req);
        return resp.IdentityId;
    };
    const initiateAuth = async (idProvider, param) => {
        const res = await idProvider.send(new client_cognito_identity_provider_1.InitiateAuthCommand({
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
                REFRESH_TOKEN: param.refreshToken,
            },
            ClientId: param.clientId,
        }));
        const result = res.AuthenticationResult;
        return {
            idToken: result.IdToken,
            accessToken: result.AccessToken,
            refreshToken: result.RefreshToken,
            expiresIn: result.ExpiresIn,
            tokenType: result.TokenType,
        };
    };
    const getDefaultRoles = async (client, param) => client.send(new client_cognito_identity_1.GetIdentityPoolRolesCommand({
        IdentityPoolId: param.idPoolId,
    }));
    const getOpenIDToken = async (client, param) => {
        const { identityProvider, idToken } = param;
        const logins = { [identityProvider]: idToken };
        return client.send(new client_cognito_identity_1.GetOpenIdTokenCommand({
            IdentityId: param.identityId,
            Logins: logins,
        }));
    };
    const assumeRoleWithWebIdentity = async (client, param) => {
        const request = new client_sts_1.AssumeRoleWithWebIdentityCommand({
            WebIdentityToken: param.token,
            RoleArn: param.roleArn,
            RoleSessionName: param.roleSessionName,
            DurationSeconds: param.sessionDuration,
        });
        return client.send(request);
    };
    const getCredentials = async (identityClient, param) => {
        const { identityProvider, idPoolId, clientId, refreshToken, } = param;
        const idpClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({});
        const initiateAuthResp = await initiateAuth(idpClient, {
            clientId,
            refreshToken,
        });
        const { idToken } = initiateAuthResp;
        const tokenExpiration = initiateAuthResp.expiresIn;
        const identityId = await getId(identityClient, {
            identityProvider,
            idPoolId,
            idToken,
        });
        const payload = jwt.decode(idToken);
        const preferredRole = payload['cognito:preferred_role'];
        const username = payload['cognito:username'];
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
            const credentials = await assumeRoleWithWebIdentity(new client_sts_1.STSClient({}), {
                token: openIdToken.Token,
                roleArn: roleArn,
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
        }
        catch (e) {
            logger.error(JSON.stringify(e));
            throw e;
        }
    };
    const signIn = async (param) => {
        const { domain, userPoolId, region, clientId, redirectUri, code, idPoolId, identityProvider, } = param;
        const { refreshToken, } = param;
        const identityClient = new client_cognito_identity_1.CognitoIdentityClient({});
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
            jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
        });
        const getKey = (header, callback) => {
            if (!header.kid)
                throw new Error('not found kid!');
            client.getSigningKey(header.kid, (err, key) => {
                if (err)
                    throw err;
                callback(null, key?.getPublicKey());
            });
        };
        const { idToken } = oauthToken;
        const tokenExpiration = oauthToken.expiresIn;
        jwt.verify(idToken, getKey, (err, decoded) => {
            if (err)
                throw err;
            logger.error(decoded ? JSON.stringify(decoded) : 'undefined');
        });
        const identityId = await getId(identityClient, {
            idPoolId,
            identityProvider,
            idToken,
        });
        const payload = jwt.decode(idToken);
        const preferredRole = payload['cognito:preferred_role'];
        const username = payload['cognito:username'];
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
            const credentials = await assumeRoleWithWebIdentity(new client_sts_1.STSClient({}), {
                token: openIdToken.Token,
                roleArn: roleArn,
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
        }
        catch (e) {
            logger.error(JSON.stringify(e));
            throw e;
        }
    };
    return { signIn };
};
exports.cognitoSignInClient = cognitoSignInClient;
exports.default = exports.cognitoSignInClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnbkluLmpzIiwic291cmNlUm9vdCI6Ii4vc3JjLyIsInNvdXJjZXMiOlsic2lnbkluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhFQUUwQztBQUMxQyxnR0FBK0c7QUFDL0csb0RBQWtGO0FBQ2xGLDZDQUFnQztBQUNoQyxvQ0FBb0M7QUFDcEMsdUNBQXVDO0FBNENoQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsU0FBb0MsRUFBRSxFQUFFO0lBQzFFLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDO0lBQzNDLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFBRSxLQUFxQixFQU0vQyxFQUFFO1FBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUMxQixVQUFVLEVBQUUsb0JBQW9CO1lBQ2hDLFNBQVMsRUFBRSxLQUFLLENBQUMsUUFBUTtZQUN6QixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsWUFBWSxFQUFFLEtBQUssQ0FBQyxXQUFXO1NBR2hDLENBQUM7YUFDQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2FBQ2hGLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFekMsTUFBTSxPQUFPLEdBQUcsV0FBVyxLQUFLLENBQUMsTUFBTSxnREFBZ0QsQ0FBQztRQUV4RixNQUFNLElBQUksR0FBRyxNQUFNLElBQUEscUJBQUssRUFBQyxPQUFPLEVBQUU7WUFDaEMsTUFBTSxFQUFFLE1BQU07WUFDZCxPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLG1DQUFtQzthQUNwRDtZQUNELFFBQVEsRUFBRSxRQUFRO1lBQ2xCLElBQUk7U0FDTCxDQUFDLENBQUM7UUFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxJQUFJLEVBTTFCLENBQUM7UUFFSCxPQUFPO1lBQ0wsT0FBTyxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxRQUFRO1lBQzlCLFdBQVcsRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsWUFBWTtZQUN0QyxZQUFZLEVBQUUsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLGFBQWE7WUFDeEMsU0FBUyxFQUFFLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxVQUFVO1lBQ2xDLFNBQVMsRUFBRSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsVUFBVTtTQUNuQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsTUFBTSxLQUFLLEdBQUcsS0FBSyxFQUNqQixNQUE2QixFQUM3QixLQUFpQixFQUNBLEVBQUU7UUFDbkIsTUFBTSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxHQUFHLEtBQUssQ0FBQztRQUM1QyxNQUFNLE1BQU0sR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUMvQyxNQUFNLEdBQUcsR0FBRyxJQUFJLHNDQUFZLENBQUM7WUFDM0IsY0FBYyxFQUFFLEtBQUssQ0FBQyxRQUFRO1lBQzlCLE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLFVBQVcsQ0FBQztJQUMxQixDQUFDLENBQUM7SUFFRixNQUFNLFlBQVksR0FBRyxLQUFLLEVBQ3hCLFVBQXlDLEVBQ3pDLEtBQXdCLEVBT3ZCLEVBQUU7UUFDSCxNQUFNLEdBQUcsR0FBRyxNQUFNLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxzREFBbUIsQ0FBQztZQUN4RCxRQUFRLEVBQUUsb0JBQW9CO1lBQzlCLGNBQWMsRUFBRTtnQkFDZCxhQUFhLEVBQUUsS0FBSyxDQUFDLFlBQVk7YUFDbEM7WUFDRCxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDekIsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsb0JBQXFCLENBQUM7UUFFekMsT0FBTztZQUNMLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBUTtZQUN4QixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVk7WUFDaEMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFhO1lBQ2xDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBVTtZQUM1QixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVU7U0FDN0IsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVGLE1BQU0sZUFBZSxHQUFHLEtBQUssRUFDM0IsTUFBNkIsRUFDN0IsS0FFQyxFQUNELEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUkscURBQTJCLENBQUM7UUFDL0MsY0FBYyxFQUFFLEtBQUssQ0FBQyxRQUFRO0tBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUosTUFBTSxjQUFjLEdBQUcsS0FBSyxFQUMxQixNQUE2QixFQUM3QixLQUlDLEVBQ0QsRUFBRTtRQUNGLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDNUMsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFFL0MsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksK0NBQXFCLENBQUM7WUFDM0MsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLE1BQU0sRUFBRSxNQUFNO1NBQ2YsQ0FBQyxDQUFDLENBQUM7SUFDTixDQUFDLENBQUM7SUFFRixNQUFNLHlCQUF5QixHQUFHLEtBQUssRUFDckMsTUFBaUIsRUFDakIsS0FLQyxFQUNELEVBQUU7UUFDRixNQUFNLE9BQU8sR0FBRyxJQUFJLDZDQUFnQyxDQUFDO1lBQ25ELGdCQUFnQixFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQzdCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixlQUFlLEVBQUUsS0FBSyxDQUFDLGVBQWU7WUFDdEMsZUFBZSxFQUFFLEtBQUssQ0FBQyxlQUFlO1NBQ3ZDLENBQUMsQ0FBQztRQUNILE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixDQUFDLENBQUM7SUFFRixNQUFNLGNBQWMsR0FBRyxLQUFLLEVBQzFCLGNBQXFDLEVBQ3JDLEtBQTBCLEVBQ0ssRUFBRTtRQUNqQyxNQUFNLEVBQ0osZ0JBQWdCLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxZQUFZLEdBQ25ELEdBQUcsS0FBSyxDQUFDO1FBQ1YsTUFBTSxTQUFTLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUV4RCxNQUFNLGdCQUFnQixHQUFHLE1BQU0sWUFBWSxDQUN6QyxTQUFTLEVBQ1Q7WUFDRSxRQUFRO1lBQ1IsWUFBWTtTQUNiLENBQ0YsQ0FBQztRQUVGLE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQztRQUNyQyxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxTQUFTLENBQUM7UUFFbkQsTUFBTSxVQUFVLEdBQUcsTUFBTSxLQUFLLENBQzVCLGNBQWMsRUFDZDtZQUNFLGdCQUFnQjtZQUNoQixRQUFRO1lBQ1IsT0FBTztTQUNSLENBQ0YsQ0FBQztRQUVGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUF5QyxDQUFDO1FBQzVFLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBVyxDQUFDO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBVyxDQUFDO1FBQ3ZELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sT0FBTyxHQUFHLGFBQWEsS0FBSyxTQUFTO1lBQ3pDLENBQUMsQ0FBQyxhQUFhO1lBQ2YsQ0FBQyxDQUFDLENBQUMsTUFBTSxlQUFlLENBQUMsY0FBYyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxhQUFhLENBQUM7UUFFL0UsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSTtZQUNGLE1BQU0sV0FBVyxHQUFHLE1BQU0sY0FBYyxDQUFDLGNBQWMsRUFBRTtnQkFDdkQsVUFBVTtnQkFDVixnQkFBZ0I7Z0JBQ2hCLE9BQU87YUFDUixDQUFDLENBQUM7WUFFSCxNQUFNLFdBQVcsR0FBRyxNQUFNLHlCQUF5QixDQUFDLElBQUksc0JBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDckUsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFNO2dCQUN6QixPQUFPLEVBQUUsT0FBUTtnQkFDakIsZUFBZSxFQUFFLEtBQUssS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVE7YUFDN0QsQ0FBQyxDQUFDO1lBRUgsT0FBTztnQkFDTCxXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxXQUFXO2dCQUNqRCxTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxlQUFlO2dCQUNuRCxZQUFZLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZO2dCQUNuRCxVQUFVLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxVQUFVO2dCQUMvQyxNQUFNLEVBQUU7b0JBQ04sT0FBTztvQkFDUCxZQUFZO29CQUNaLFVBQVUsRUFBRSxlQUFlO2lCQUM1QjthQUNGLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEMsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUMsQ0FBQztJQUVGLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxLQUFrQixFQUF5QixFQUFFO1FBQ2pFLE1BQU0sRUFDSixNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEdBQ3BGLEdBQUcsS0FBSyxDQUFDO1FBQ1YsTUFBTSxFQUNKLFlBQVksR0FDYixHQUFHLEtBQUssQ0FBQztRQUNWLE1BQU0sY0FBYyxHQUFHLElBQUksK0NBQXFCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFckQsSUFBSSxZQUFZLElBQUksWUFBWSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7WUFDM0MsT0FBTyxjQUFjLENBQUMsY0FBYyxFQUFFO2dCQUNwQyxVQUFVO2dCQUNWLFFBQVE7Z0JBQ1IsZ0JBQWdCO2dCQUNoQixRQUFRO2dCQUNSLFlBQVk7YUFDYixDQUFDLENBQUM7U0FDSjtRQUVELElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxPQUFPO2dCQUNMLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixTQUFTLEVBQUUsU0FBUztnQkFDcEIsWUFBWSxFQUFFLFNBQVM7Z0JBQ3ZCLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLFNBQVM7b0JBQ2xCLFlBQVksRUFBRSxTQUFTO29CQUN2QixVQUFVLEVBQUUsU0FBUztpQkFDdEI7YUFDRixDQUFDO1NBQ0g7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGFBQWEsQ0FBQztZQUNyQyxNQUFNO1lBQ04sUUFBUTtZQUNSLFdBQVc7WUFDWCxJQUFJO1NBQ0wsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsVUFBVSxDQUFDO1lBQ3hCLE9BQU8sRUFDTCx1QkFBdUIsTUFBTSxrQkFBa0IsVUFBVSx3QkFBd0I7U0FDcEYsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFxQixFQUFFLFFBQWdDLEVBQUUsRUFBRTtZQUN6RSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUc7Z0JBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxHQUFHO29CQUFFLE1BQU0sR0FBRyxDQUFDO2dCQUNuQixRQUFRLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLFVBQVUsQ0FBQztRQUMvQixNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDO1FBRTdDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUMzQyxJQUFJLEdBQUc7Z0JBQUUsTUFBTSxHQUFHLENBQUM7WUFDbkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2hFLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsTUFBTSxLQUFLLENBQzVCLGNBQWMsRUFDZDtZQUNFLFFBQVE7WUFDUixnQkFBZ0I7WUFDaEIsT0FBTztTQUNSLENBQ0YsQ0FBQztRQUVGLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUF5QyxDQUFDO1FBQzVFLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBVyxDQUFDO1FBQ2xFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBVyxDQUFDO1FBQ3ZELE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxPQUFPLENBQUM7UUFDMUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWhELE1BQU0sT0FBTyxHQUFHLGFBQWEsSUFBSSxDQUFDLE1BQU0sZUFBZSxDQUFDLGNBQWMsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDO1FBRTVHLE1BQU0sQ0FBQyxLQUFLLENBQUMsYUFBYSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLElBQUk7WUFDRixNQUFNLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBQyxjQUFjLEVBQUU7Z0JBQ3ZELFVBQVU7Z0JBQ1YsZ0JBQWdCO2dCQUNoQixPQUFPO2FBQ1IsQ0FBQyxDQUFDO1lBRUgsTUFBTSxXQUFXLEdBQUcsTUFBTSx5QkFBeUIsQ0FBQyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3JFLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBTTtnQkFDekIsT0FBTyxFQUFFLE9BQVE7Z0JBQ2pCLGVBQWUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVE7YUFDL0MsQ0FBQyxDQUFDO1lBRUgsT0FBTztnQkFDTCxXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxXQUFXO2dCQUNqRCxTQUFTLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxlQUFlO2dCQUNuRCxZQUFZLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxZQUFZO2dCQUNuRCxVQUFVLEVBQUUsV0FBVyxDQUFDLFdBQVcsRUFBRSxVQUFVO2dCQUMvQyxNQUFNLEVBQUU7b0JBQ04sT0FBTztvQkFDUCxZQUFZO29CQUNaLFVBQVUsRUFBRSxlQUFlO2lCQUM1QjthQUNGLENBQUM7U0FDSDtRQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ1YsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEMsTUFBTSxDQUFDLENBQUM7U0FDVDtJQUNILENBQUMsQ0FBQztJQUNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUE1VFcsUUFBQSxtQkFBbUIsdUJBNFQ5QjtBQUVGLGtCQUFlLDJCQUFtQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQ29nbml0b0lkZW50aXR5Q2xpZW50LCBHZXRJZENvbW1hbmQsIEdldElkZW50aXR5UG9vbFJvbGVzQ29tbWFuZCwgR2V0T3BlbklkVG9rZW5Db21tYW5kLFxufSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eSc7XG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgSW5pdGlhdGVBdXRoQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcbmltcG9ydCB7IEFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHlDb21tYW5kLCBTVFNDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3RzJztcbmltcG9ydCBmZXRjaCBmcm9tICdjcm9zcy1mZXRjaCc7XG5pbXBvcnQgKiBhcyBqd3QgZnJvbSAnanNvbndlYnRva2VuJztcbmltcG9ydCAqIGFzIGp3a3NDbGllbnQgZnJvbSAnandrcy1yc2EnO1xuXG5pbXBvcnQgeyBTaWduSW5QYXJhbSwgU2ltcGxlTG9nZ2VyIH0gZnJvbSAnLi90eXBlcyc7XG5cbmludGVyZmFjZSBUb2tlbkF1dGhQYXJhbSB7XG4gIGRvbWFpbjogc3RyaW5nLFxuICBjbGllbnRJZDogc3RyaW5nLFxuICByZWRpcmVjdFVyaTogc3RyaW5nLFxuICBjb2RlOiBzdHJpbmcsXG59XG5cbmludGVyZmFjZSBHZXRJZFBhcmFtIHtcbiAgaWRlbnRpdHlQcm92aWRlcjogc3RyaW5nLFxuICBpZFBvb2xJZDogc3RyaW5nLFxuICBpZFRva2VuOiBzdHJpbmcsXG59XG5cbmludGVyZmFjZSBJbml0aWF0ZUF1dGhQYXJhbSB7XG4gIGNsaWVudElkOiBzdHJpbmcsXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nLFxufVxuXG5pbnRlcmZhY2UgR2V0Q3JlZGVudGlhbHNQYXJhbSB7XG4gIHVzZXJQb29sSWQ6IHN0cmluZyxcbiAgaWRQb29sSWQ6IHN0cmluZyxcbiAgY2xpZW50SWQ6IHN0cmluZyxcbiAgaWRlbnRpdHlQcm92aWRlcjogc3RyaW5nLFxuICByZWZyZXNoVG9rZW46IHN0cmluZyxcbn1cblxuaW50ZXJmYWNlIEdldENyZWRlbnRpYWxzUmVzdWx0IHtcbiAgYWNjZXNzS2V5SWQ6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgc2VjcmV0S2V5OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHNlc3Npb25Ub2tlbjogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICBleHBpcmF0aW9uOiBEYXRlIHwgdW5kZWZpbmVkLFxuICB0b2tlbnM6IHtcbiAgICBpZFRva2VuOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgcmVmcmVzaFRva2VuOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgZXhwaXJhdGlvbjogbnVtYmVyIHwgdW5kZWZpbmVkLFxuICB9XG59XG5cbnR5cGUgU2lnbmluUmVzdWx0ID0gR2V0Q3JlZGVudGlhbHNSZXN1bHQ7XG5cbmV4cG9ydCBjb25zdCBjb2duaXRvU2lnbkluQ2xpZW50ID0gKGluaXRQYXJhbTogeyBsb2dnZXI/OiBTaW1wbGVMb2dnZXIgfSkgPT4ge1xuICBjb25zdCBsb2dnZXIgPSBpbml0UGFyYW0ubG9nZ2VyIHx8IGNvbnNvbGU7XG4gIGNvbnN0IGdldE9BdXRoVG9rZW4gPSBhc3luYyAocGFyYW06IFRva2VuQXV0aFBhcmFtKTogUHJvbWlzZTx7XG4gICAgaWRUb2tlbjogc3RyaW5nLFxuICAgIGFjY2Vzc1Rva2VuOiBzdHJpbmcsXG4gICAgcmVmcmVzaFRva2VuOiBzdHJpbmcsXG4gICAgZXhwaXJlc0luOiBudW1iZXIsXG4gICAgdG9rZW5UeXBlOiBzdHJpbmcsXG4gIH0+ID0+IHtcbiAgICBjb25zdCBib2R5ID0gT2JqZWN0LmVudHJpZXMoe1xuICAgICAgZ3JhbnRfdHlwZTogJ2F1dGhvcml6YXRpb25fY29kZScsXG4gICAgICBjbGllbnRfaWQ6IHBhcmFtLmNsaWVudElkLFxuICAgICAgY29kZTogcGFyYW0uY29kZSxcbiAgICAgIHJlZGlyZWN0X3VyaTogcGFyYW0ucmVkaXJlY3RVcmksXG4gICAgfSBhcyB7XG4gICAgICBba2V5OiBzdHJpbmddOiBzdHJpbmdcbiAgICB9KVxuICAgICAgLm1hcCgoW2tleSwgdmFsdWVdKSA9PiBgJHtlbmNvZGVVUklDb21wb25lbnQoa2V5KX09JHtlbmNvZGVVUklDb21wb25lbnQodmFsdWUpfWApXG4gICAgICAucmVkdWNlKChjdXIsIGFjYykgPT4gYCR7YWNjfSYke2N1cn1gKTtcblxuICAgIGNvbnN0IGF1dGhVcmkgPSBgaHR0cHM6Ly8ke3BhcmFtLmRvbWFpbn0uYXV0aC51cy13ZXN0LTIuYW1hem9uY29nbml0by5jb20vb2F1dGgyL3Rva2VuYDtcblxuICAgIGNvbnN0IHJlc3AgPSBhd2FpdCBmZXRjaChhdXRoVXJpLCB7XG4gICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICAgfSxcbiAgICAgIHJlZGlyZWN0OiAnZm9sbG93JyxcbiAgICAgIGJvZHksXG4gICAgfSk7XG4gICAgY29uc3QganNvbiA9IGF3YWl0IHJlc3AuanNvbigpIGFzIFByb21pc2U8e1xuICAgICAgaWRfdG9rZW46IHN0cmluZyxcbiAgICAgIGFjY2Vzc190b2tlbjogc3RyaW5nLFxuICAgICAgcmVmcmVzaF90b2tlbjogc3RyaW5nLFxuICAgICAgZXhwaXJlc19pbjogbnVtYmVyLFxuICAgICAgdG9rZW5fdHlwZTogc3RyaW5nLFxuICAgIH0+O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkVG9rZW46IChhd2FpdCBqc29uKS5pZF90b2tlbixcbiAgICAgIGFjY2Vzc1Rva2VuOiAoYXdhaXQganNvbikuYWNjZXNzX3Rva2VuLFxuICAgICAgcmVmcmVzaFRva2VuOiAoYXdhaXQganNvbikucmVmcmVzaF90b2tlbixcbiAgICAgIGV4cGlyZXNJbjogKGF3YWl0IGpzb24pLmV4cGlyZXNfaW4sXG4gICAgICB0b2tlblR5cGU6IChhd2FpdCBqc29uKS50b2tlbl90eXBlLFxuICAgIH07XG4gIH07XG5cbiAgY29uc3QgZ2V0SWQgPSBhc3luYyAoXG4gICAgY2xpZW50OiBDb2duaXRvSWRlbnRpdHlDbGllbnQsXG4gICAgcGFyYW06IEdldElkUGFyYW0sXG4gICk6IFByb21pc2U8c3RyaW5nPiA9PiB7XG4gICAgY29uc3QgeyBpZGVudGl0eVByb3ZpZGVyLCBpZFRva2VuIH0gPSBwYXJhbTtcbiAgICBjb25zdCBsb2dpbnMgPSB7IFtpZGVudGl0eVByb3ZpZGVyXTogaWRUb2tlbiB9O1xuICAgIGNvbnN0IHJlcSA9IG5ldyBHZXRJZENvbW1hbmQoe1xuICAgICAgSWRlbnRpdHlQb29sSWQ6IHBhcmFtLmlkUG9vbElkLFxuICAgICAgTG9naW5zOiBsb2dpbnMsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZXNwID0gYXdhaXQgY2xpZW50LnNlbmQocmVxKTtcbiAgICByZXR1cm4gcmVzcC5JZGVudGl0eUlkITtcbiAgfTtcblxuICBjb25zdCBpbml0aWF0ZUF1dGggPSBhc3luYyAoXG4gICAgaWRQcm92aWRlcjogQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsXG4gICAgcGFyYW06IEluaXRpYXRlQXV0aFBhcmFtLFxuICApOiBQcm9taXNlPHtcbiAgICBpZFRva2VuOiBzdHJpbmcsXG4gICAgYWNjZXNzVG9rZW46IHN0cmluZyxcbiAgICByZWZyZXNoVG9rZW46IHN0cmluZyxcbiAgICBleHBpcmVzSW46IG51bWJlcixcbiAgICB0b2tlblR5cGU6IHN0cmluZyxcbiAgfT4gPT4ge1xuICAgIGNvbnN0IHJlcyA9IGF3YWl0IGlkUHJvdmlkZXIuc2VuZChuZXcgSW5pdGlhdGVBdXRoQ29tbWFuZCh7XG4gICAgICBBdXRoRmxvdzogJ1JFRlJFU0hfVE9LRU5fQVVUSCcsXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xuICAgICAgICBSRUZSRVNIX1RPS0VOOiBwYXJhbS5yZWZyZXNoVG9rZW4sXG4gICAgICB9LFxuICAgICAgQ2xpZW50SWQ6IHBhcmFtLmNsaWVudElkLFxuICAgIH0pKTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IHJlcy5BdXRoZW50aWNhdGlvblJlc3VsdCE7XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWRUb2tlbjogcmVzdWx0LklkVG9rZW4hLFxuICAgICAgYWNjZXNzVG9rZW46IHJlc3VsdC5BY2Nlc3NUb2tlbiEsXG4gICAgICByZWZyZXNoVG9rZW46IHJlc3VsdC5SZWZyZXNoVG9rZW4hLFxuICAgICAgZXhwaXJlc0luOiByZXN1bHQuRXhwaXJlc0luISxcbiAgICAgIHRva2VuVHlwZTogcmVzdWx0LlRva2VuVHlwZSEsXG4gICAgfTtcbiAgfTtcblxuICBjb25zdCBnZXREZWZhdWx0Um9sZXMgPSBhc3luYyAoXG4gICAgY2xpZW50OiBDb2duaXRvSWRlbnRpdHlDbGllbnQsXG4gICAgcGFyYW06IHtcbiAgICAgIGlkUG9vbElkOiBzdHJpbmcsXG4gICAgfSxcbiAgKSA9PiBjbGllbnQuc2VuZChuZXcgR2V0SWRlbnRpdHlQb29sUm9sZXNDb21tYW5kKHtcbiAgICBJZGVudGl0eVBvb2xJZDogcGFyYW0uaWRQb29sSWQsXG4gIH0pKTtcblxuICBjb25zdCBnZXRPcGVuSURUb2tlbiA9IGFzeW5jIChcbiAgICBjbGllbnQ6IENvZ25pdG9JZGVudGl0eUNsaWVudCxcbiAgICBwYXJhbToge1xuICAgICAgaWRlbnRpdHlJZDogc3RyaW5nLFxuICAgICAgaWRlbnRpdHlQcm92aWRlcjogc3RyaW5nLFxuICAgICAgaWRUb2tlbjogc3RyaW5nLFxuICAgIH0sXG4gICkgPT4ge1xuICAgIGNvbnN0IHsgaWRlbnRpdHlQcm92aWRlciwgaWRUb2tlbiB9ID0gcGFyYW07XG4gICAgY29uc3QgbG9naW5zID0geyBbaWRlbnRpdHlQcm92aWRlcl06IGlkVG9rZW4gfTtcblxuICAgIHJldHVybiBjbGllbnQuc2VuZChuZXcgR2V0T3BlbklkVG9rZW5Db21tYW5kKHtcbiAgICAgIElkZW50aXR5SWQ6IHBhcmFtLmlkZW50aXR5SWQsXG4gICAgICBMb2dpbnM6IGxvZ2lucyxcbiAgICB9KSk7XG4gIH07XG5cbiAgY29uc3QgYXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eSA9IGFzeW5jIChcbiAgICBjbGllbnQ6IFNUU0NsaWVudCxcbiAgICBwYXJhbToge1xuICAgICAgdG9rZW46IHN0cmluZyxcbiAgICAgIHJvbGVBcm46IHN0cmluZyxcbiAgICAgIHJvbGVTZXNzaW9uTmFtZTogc3RyaW5nLFxuICAgICAgc2Vzc2lvbkR1cmF0aW9uPzogbnVtYmVyLFxuICAgIH0sXG4gICkgPT4ge1xuICAgIGNvbnN0IHJlcXVlc3QgPSBuZXcgQXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eUNvbW1hbmQoe1xuICAgICAgV2ViSWRlbnRpdHlUb2tlbjogcGFyYW0udG9rZW4sXG4gICAgICBSb2xlQXJuOiBwYXJhbS5yb2xlQXJuLFxuICAgICAgUm9sZVNlc3Npb25OYW1lOiBwYXJhbS5yb2xlU2Vzc2lvbk5hbWUsXG4gICAgICBEdXJhdGlvblNlY29uZHM6IHBhcmFtLnNlc3Npb25EdXJhdGlvbixcbiAgICB9KTtcbiAgICByZXR1cm4gY2xpZW50LnNlbmQocmVxdWVzdCk7XG4gIH07XG5cbiAgY29uc3QgZ2V0Q3JlZGVudGlhbHMgPSBhc3luYyAoXG4gICAgaWRlbnRpdHlDbGllbnQ6IENvZ25pdG9JZGVudGl0eUNsaWVudCxcbiAgICBwYXJhbTogR2V0Q3JlZGVudGlhbHNQYXJhbSxcbiAgKTogUHJvbWlzZTxHZXRDcmVkZW50aWFsc1Jlc3VsdD4gPT4ge1xuICAgIGNvbnN0IHtcbiAgICAgIGlkZW50aXR5UHJvdmlkZXIsIGlkUG9vbElkLCBjbGllbnRJZCwgcmVmcmVzaFRva2VuLFxuICAgIH0gPSBwYXJhbTtcbiAgICBjb25zdCBpZHBDbGllbnQgPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoe30pO1xuXG4gICAgY29uc3QgaW5pdGlhdGVBdXRoUmVzcCA9IGF3YWl0IGluaXRpYXRlQXV0aChcbiAgICAgIGlkcENsaWVudCxcbiAgICAgIHtcbiAgICAgICAgY2xpZW50SWQsXG4gICAgICAgIHJlZnJlc2hUb2tlbixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbnN0IHsgaWRUb2tlbiB9ID0gaW5pdGlhdGVBdXRoUmVzcDtcbiAgICBjb25zdCB0b2tlbkV4cGlyYXRpb24gPSBpbml0aWF0ZUF1dGhSZXNwLmV4cGlyZXNJbjtcblxuICAgIGNvbnN0IGlkZW50aXR5SWQgPSBhd2FpdCBnZXRJZChcbiAgICAgIGlkZW50aXR5Q2xpZW50LFxuICAgICAge1xuICAgICAgICBpZGVudGl0eVByb3ZpZGVyLFxuICAgICAgICBpZFBvb2xJZCxcbiAgICAgICAgaWRUb2tlbixcbiAgICAgIH0sXG4gICAgKTtcblxuICAgIGNvbnN0IHBheWxvYWQgPSBqd3QuZGVjb2RlKGlkVG9rZW4pIGFzIHsgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgc3RyaW5nW10gfTtcbiAgICBjb25zdCBwcmVmZXJyZWRSb2xlID0gcGF5bG9hZFsnY29nbml0bzpwcmVmZXJyZWRfcm9sZSddIGFzIHN0cmluZztcbiAgICBjb25zdCB1c2VybmFtZSA9IHBheWxvYWRbJ2NvZ25pdG86dXNlcm5hbWUnXSBhcyBzdHJpbmc7XG4gICAgY29uc3QgeyBlbWFpbCB9ID0gcGF5bG9hZDtcbiAgICBsb2dnZXIuZGVidWcoYEpXVDogJHtKU09OLnN0cmluZ2lmeShwYXlsb2FkKX1gKTtcblxuICAgIGNvbnN0IHJvbGVBcm4gPSBwcmVmZXJyZWRSb2xlICE9PSB1bmRlZmluZWRcbiAgICAgID8gcHJlZmVycmVkUm9sZVxuICAgICAgOiAoYXdhaXQgZ2V0RGVmYXVsdFJvbGVzKGlkZW50aXR5Q2xpZW50LCB7IGlkUG9vbElkIH0pKS5Sb2xlcz8uYXV0aGVudGljYXRlZDtcblxuICAgIGxvZ2dlci5kZWJ1Zyhgcm9sZSBhcm46ICR7cm9sZUFybn1gKTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgb3BlbklkVG9rZW4gPSBhd2FpdCBnZXRPcGVuSURUb2tlbihpZGVudGl0eUNsaWVudCwge1xuICAgICAgICBpZGVudGl0eUlkLFxuICAgICAgICBpZGVudGl0eVByb3ZpZGVyLFxuICAgICAgICBpZFRva2VuLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gYXdhaXQgYXNzdW1lUm9sZVdpdGhXZWJJZGVudGl0eShuZXcgU1RTQ2xpZW50KHt9KSwge1xuICAgICAgICB0b2tlbjogb3BlbklkVG9rZW4uVG9rZW4hLFxuICAgICAgICByb2xlQXJuOiByb2xlQXJuISxcbiAgICAgICAgcm9sZVNlc3Npb25OYW1lOiBlbWFpbCAhPT0gdW5kZWZpbmVkID8gYCR7ZW1haWx9YCA6IHVzZXJuYW1lLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFjY2Vzc0tleUlkOiBjcmVkZW50aWFscy5DcmVkZW50aWFscz8uQWNjZXNzS2V5SWQsXG4gICAgICAgIHNlY3JldEtleTogY3JlZGVudGlhbHMuQ3JlZGVudGlhbHM/LlNlY3JldEFjY2Vzc0tleSxcbiAgICAgICAgc2Vzc2lvblRva2VuOiBjcmVkZW50aWFscy5DcmVkZW50aWFscz8uU2Vzc2lvblRva2VuLFxuICAgICAgICBleHBpcmF0aW9uOiBjcmVkZW50aWFscy5DcmVkZW50aWFscz8uRXhwaXJhdGlvbixcbiAgICAgICAgdG9rZW5zOiB7XG4gICAgICAgICAgaWRUb2tlbixcbiAgICAgICAgICByZWZyZXNoVG9rZW4sXG4gICAgICAgICAgZXhwaXJhdGlvbjogdG9rZW5FeHBpcmF0aW9uLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoSlNPTi5zdHJpbmdpZnkoZSkpO1xuXG4gICAgICB0aHJvdyBlO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBzaWduSW4gPSBhc3luYyAocGFyYW06IFNpZ25JblBhcmFtKTogUHJvbWlzZTxTaWduaW5SZXN1bHQ+ID0+IHtcbiAgICBjb25zdCB7XG4gICAgICBkb21haW4sIHVzZXJQb29sSWQsIHJlZ2lvbiwgY2xpZW50SWQsIHJlZGlyZWN0VXJpLCBjb2RlLCBpZFBvb2xJZCwgaWRlbnRpdHlQcm92aWRlcixcbiAgICB9ID0gcGFyYW07XG4gICAgY29uc3Qge1xuICAgICAgcmVmcmVzaFRva2VuLFxuICAgIH0gPSBwYXJhbTtcbiAgICBjb25zdCBpZGVudGl0eUNsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlDbGllbnQoe30pO1xuXG4gICAgaWYgKHJlZnJlc2hUb2tlbiAmJiByZWZyZXNoVG9rZW4ubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGdldENyZWRlbnRpYWxzKGlkZW50aXR5Q2xpZW50LCB7XG4gICAgICAgIHVzZXJQb29sSWQsXG4gICAgICAgIGlkUG9vbElkLFxuICAgICAgICBpZGVudGl0eVByb3ZpZGVyLFxuICAgICAgICBjbGllbnRJZCxcbiAgICAgICAgcmVmcmVzaFRva2VuLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFjb2RlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhY2Nlc3NLZXlJZDogdW5kZWZpbmVkLFxuICAgICAgICBzZWNyZXRLZXk6IHVuZGVmaW5lZCxcbiAgICAgICAgc2Vzc2lvblRva2VuOiB1bmRlZmluZWQsXG4gICAgICAgIGV4cGlyYXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgdG9rZW5zOiB7XG4gICAgICAgICAgaWRUb2tlbjogdW5kZWZpbmVkLFxuICAgICAgICAgIHJlZnJlc2hUb2tlbjogdW5kZWZpbmVkLFxuICAgICAgICAgIGV4cGlyYXRpb246IHVuZGVmaW5lZCxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3Qgb2F1dGhUb2tlbiA9IGF3YWl0IGdldE9BdXRoVG9rZW4oe1xuICAgICAgZG9tYWluLFxuICAgICAgY2xpZW50SWQsXG4gICAgICByZWRpcmVjdFVyaSxcbiAgICAgIGNvZGUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjbGllbnQgPSBqd2tzQ2xpZW50KHtcbiAgICAgIGp3a3NVcmk6XG4gICAgICAgIGBodHRwczovL2NvZ25pdG8taWRwLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7dXNlclBvb2xJZH0vLndlbGwta25vd24vandrcy5qc29uYCxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldEtleSA9IChoZWFkZXI6IGp3dC5Kd3RIZWFkZXIsIGNhbGxiYWNrOiBqd3QuU2lnbmluZ0tleUNhbGxiYWNrKSA9PiB7XG4gICAgICBpZiAoIWhlYWRlci5raWQpIHRocm93IG5ldyBFcnJvcignbm90IGZvdW5kIGtpZCEnKTtcbiAgICAgIGNsaWVudC5nZXRTaWduaW5nS2V5KGhlYWRlci5raWQsIChlcnIsIGtleSkgPT4ge1xuICAgICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGtleT8uZ2V0UHVibGljS2V5KCkpO1xuICAgICAgfSk7XG4gICAgfTtcblxuICAgIGNvbnN0IHsgaWRUb2tlbiB9ID0gb2F1dGhUb2tlbjtcbiAgICBjb25zdCB0b2tlbkV4cGlyYXRpb24gPSBvYXV0aFRva2VuLmV4cGlyZXNJbjtcblxuICAgIGp3dC52ZXJpZnkoaWRUb2tlbiwgZ2V0S2V5LCAoZXJyLCBkZWNvZGVkKSA9PiB7XG4gICAgICBpZiAoZXJyKSB0aHJvdyBlcnI7XG4gICAgICBsb2dnZXIuZXJyb3IoZGVjb2RlZCA/IEpTT04uc3RyaW5naWZ5KGRlY29kZWQpIDogJ3VuZGVmaW5lZCcpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgaWRlbnRpdHlJZCA9IGF3YWl0IGdldElkKFxuICAgICAgaWRlbnRpdHlDbGllbnQsXG4gICAgICB7XG4gICAgICAgIGlkUG9vbElkLFxuICAgICAgICBpZGVudGl0eVByb3ZpZGVyLFxuICAgICAgICBpZFRva2VuLFxuICAgICAgfSxcbiAgICApO1xuXG4gICAgY29uc3QgcGF5bG9hZCA9IGp3dC5kZWNvZGUoaWRUb2tlbikgYXMgeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBzdHJpbmdbXSB9O1xuICAgIGNvbnN0IHByZWZlcnJlZFJvbGUgPSBwYXlsb2FkWydjb2duaXRvOnByZWZlcnJlZF9yb2xlJ10gYXMgc3RyaW5nO1xuICAgIGNvbnN0IHVzZXJuYW1lID0gcGF5bG9hZFsnY29nbml0bzp1c2VybmFtZSddIGFzIHN0cmluZztcbiAgICBjb25zdCB7IGVtYWlsIH0gPSBwYXlsb2FkO1xuICAgIGxvZ2dlci5kZWJ1ZyhgSldUOiAke0pTT04uc3RyaW5naWZ5KHBheWxvYWQpfWApO1xuXG4gICAgY29uc3Qgcm9sZUFybiA9IHByZWZlcnJlZFJvbGUgfHwgKGF3YWl0IGdldERlZmF1bHRSb2xlcyhpZGVudGl0eUNsaWVudCwgeyBpZFBvb2xJZCB9KSkuUm9sZXM/LmF1dGhlbnRpY2F0ZWQ7XG5cbiAgICBsb2dnZXIuZGVidWcoYHJvbGUgYXJuOiAke3JvbGVBcm59YCk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG9wZW5JZFRva2VuID0gYXdhaXQgZ2V0T3BlbklEVG9rZW4oaWRlbnRpdHlDbGllbnQsIHtcbiAgICAgICAgaWRlbnRpdHlJZCxcbiAgICAgICAgaWRlbnRpdHlQcm92aWRlcixcbiAgICAgICAgaWRUb2tlbixcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBjcmVkZW50aWFscyA9IGF3YWl0IGFzc3VtZVJvbGVXaXRoV2ViSWRlbnRpdHkobmV3IFNUU0NsaWVudCh7fSksIHtcbiAgICAgICAgdG9rZW46IG9wZW5JZFRva2VuLlRva2VuISxcbiAgICAgICAgcm9sZUFybjogcm9sZUFybiEsXG4gICAgICAgIHJvbGVTZXNzaW9uTmFtZTogZW1haWwgPyBgJHtlbWFpbH1gIDogdXNlcm5hbWUsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgYWNjZXNzS2V5SWQ6IGNyZWRlbnRpYWxzLkNyZWRlbnRpYWxzPy5BY2Nlc3NLZXlJZCxcbiAgICAgICAgc2VjcmV0S2V5OiBjcmVkZW50aWFscy5DcmVkZW50aWFscz8uU2VjcmV0QWNjZXNzS2V5LFxuICAgICAgICBzZXNzaW9uVG9rZW46IGNyZWRlbnRpYWxzLkNyZWRlbnRpYWxzPy5TZXNzaW9uVG9rZW4sXG4gICAgICAgIGV4cGlyYXRpb246IGNyZWRlbnRpYWxzLkNyZWRlbnRpYWxzPy5FeHBpcmF0aW9uLFxuICAgICAgICB0b2tlbnM6IHtcbiAgICAgICAgICBpZFRva2VuLFxuICAgICAgICAgIHJlZnJlc2hUb2tlbixcbiAgICAgICAgICBleHBpcmF0aW9uOiB0b2tlbkV4cGlyYXRpb24sXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihKU09OLnN0cmluZ2lmeShlKSk7XG5cbiAgICAgIHRocm93IGU7XG4gICAgfVxuICB9O1xuICByZXR1cm4geyBzaWduSW4gfTtcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNvZ25pdG9TaWduSW5DbGllbnQ7XG4iXX0=