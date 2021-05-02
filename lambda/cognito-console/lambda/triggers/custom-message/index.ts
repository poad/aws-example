// import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, CustomMessageTriggerEvent, CustomMessageTriggerHandler } from "aws-lambda";

export const handler: CustomMessageTriggerHandler = async (
    event: CustomMessageTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    // console.log(JSON.stringify(event));

    // const { userPoolId, request, triggerSource } = event;
    // if (triggerSource === 'PreSignUp_ExternalProvider') {
    //     const { userAttributes } = request;
    //     const { email } = userAttributes;

    //     const identityProvider = new CognitoIdentityProviderClient({});

    //     const user = (await identityProvider.send(new ListUsersCommand({
    //         UserPoolId: userPoolId,
    //         Filter: `email = \"${email}\"`
    //     }))).Users?.find((user) => user.UserStatus !== "EXTERNAL_PROVIDER");

    //     if (user !== undefined) {
    //         event.response.autoVerifyEmail = true;
    //         // event.userName = event.userName.substr(event.userName.indexOf('_') + 1);
    //     }
    //     console.log(JSON.stringify(event));
    // }

    callback(null, event);
};
