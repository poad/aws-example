import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PreSignUpTriggerEvent, PreSignUpTriggerHandler } from "aws-lambda";
import { StringMap } from "aws-lambda/trigger/cognito-user-pool-trigger/_common";

export const handler: PreSignUpTriggerHandler = async (
    event: PreSignUpTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    // console.log(JSON.stringify(event));

    const { userPoolId, request, triggerSource } = event;

    if (triggerSource === 'PreSignUp_ExternalProvider') {
        const { userAttributes } = request;
        const { email } = userAttributes;

        const identityProvider = new CognitoIdentityProviderClient({});

        const user = (await identityProvider.send(new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `email = \"${email}\"`
        }))).Users?.find((user) => user.UserStatus !== "EXTERNAL_PROVIDER");

        if (user === undefined) {
            return callback('No such link target', event);
        }

        const provider = event.userName.split('_')[0];
        const identities: StringMap[] = (user.Attributes || [])
                .filter(attribute => attribute.Name === 'identities' && attribute.Value !== undefined)
                .flatMap(attribute => JSON.parse(attribute.Value!) as StringMap[]);
        if (identities.find((identity) => identity.providerName !== undefined && identity.providerName === provider) === undefined) {
            return callback('No such link target', event);
        }
        event.response.autoVerifyEmail = true;

    }
    callback(null, event);
}
