// import { AdminDeleteUserCommand, AdminLinkProviderForUserCommand, AdminUserGlobalSignOutCommand, CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from "aws-lambda";

export const handler: PostConfirmationTriggerHandler = async (
    event: PostConfirmationTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    // console.log(JSON.stringify(event));

    // const { userPoolId, userName, request, triggerSource } = event;
    // if (triggerSource === 'PostConfirmation_ConfirmSignUp') {
    //     const { userAttributes } = request;
    //     const email = userAttributes['email'];
    //     const identities = userAttributes['identities'];
    //     const { userId, providerName } = JSON.parse(identities)[0];

    //     console.trace(identities);

    //     const identityProvider = new CognitoIdentityProviderClient({});

    //     const user = (await identityProvider.send(new ListUsersCommand({
    //         UserPoolId: userPoolId,
    //         Filter: `email = \"${email}\"`
    //     }))).Users?.find((user) => user.UserStatus !== "EXTERNAL_PROVIDER");

    //     if (user !== undefined) {

    //         await identityProvider.send(new AdminUserGlobalSignOutCommand({
    //             UserPoolId: userPoolId,
    //             Username: userName
    //         }));
    //         await identityProvider.send(new AdminDeleteUserCommand({
    //             UserPoolId: userPoolId,
    //             Username: userName
    //         }));

    //         await identityProvider.send(new AdminLinkProviderForUserCommand({
    //             UserPoolId: userPoolId,
    //             DestinationUser: {
    //                 ProviderName: 'Cognito',
    //                 ProviderAttributeValue: user.Username!
    //             },
    //             SourceUser: {
    //                 ProviderName: providerName,
    //                 ProviderAttributeName: 'Cognito_Subject',
    //                 ProviderAttributeValue: userId
    //             }
    //         }));

    //         // event.userName = user.Username!;

    //         // return {
    //         //     statusCode: 200
    //         // };
    //     }
    // }
    // console.log(JSON.stringify(event));

    callback(null, event);
};
