import { AdminCreateUserCommand, AdminLinkProviderForUserCommand, AdminLinkProviderForUserResponse, CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PostAuthenticationTriggerEvent, PostAuthenticationTriggerHandler } from "aws-lambda";
import { StringMap } from "aws-lambda/trigger/cognito-user-pool-trigger/_common";

const adminLinkProviderForUser = async (
    identityProvider: CognitoIdentityProviderClient,
    params: {
        provider: string,
        destUserPoolId: string,
        userName: string,
        sourceSub: string,
    },
): Promise<AdminLinkProviderForUserResponse> => {
    const { provider, destUserPoolId, userName, sourceSub } = params;

    return await identityProvider.send(new AdminLinkProviderForUserCommand({
        UserPoolId: destUserPoolId,
        DestinationUser: {
            ProviderName: 'Cognito',
            ProviderAttributeValue: userName
        },
        SourceUser: {
            ProviderName: provider,
            ProviderAttributeName: 'Cognito_Subject',
            ProviderAttributeValue: sourceSub
        }
    }));
}

export const handler: PostAuthenticationTriggerHandler = async (
    event: PostAuthenticationTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    // console.log(JSON.stringify(event));

    const { userName, request, triggerSource } = event;
    const destUserPoolId = process.env.DEST_USER_POOL_ID;
    const provider = process.env.PROVIDER;

    const sourceSub = event.request.userAttributes.sub;

    if (triggerSource === 'PostAuthentication_Authentication' && destUserPoolId !== undefined && provider !== undefined) {
        const { userAttributes } = request;
        const email = userAttributes['email'];

        const identityProvider = new CognitoIdentityProviderClient({});

        const user = (await identityProvider.send(new ListUsersCommand({
            UserPoolId: destUserPoolId,
            Filter: `email = \"${email}\"`
        }))).Users?.find((user) => user.UserStatus !== "EXTERNAL_PROVIDER");

        if (user !== undefined) {
            const identities = user.Attributes?.find(attribute => attribute.Name === 'identities')?.Value;
            const identity = identities !== undefined ? JSON.parse(identities).find((identity: StringMap) => identity.providerName === provider) : undefined;
            if (identity !== undefined) {
                // eslint-disable-next-line no-console
                console.log('Skipped. already linked');
                callback(null, event);
                return;
            }
        } else {
            await identityProvider.send(new AdminCreateUserCommand({
                UserPoolId: destUserPoolId,
                Username: userName,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email
                    },
                    {
                        Name: 'email_verified',
                        Value: 'true'
                    }
                ],
                ForceAliasCreation: true,
            }));
        }

        await adminLinkProviderForUser(identityProvider, {
            provider,
            destUserPoolId,
            userName,
            sourceSub
        });
    }

    callback(null, event);
};
