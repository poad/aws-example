import { AdminDeleteUserCommand, AdminLinkProviderForUserCommand, AdminUserGlobalSignOutCommand, CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PreSignUpTriggerEvent, PreSignUpTriggerHandler } from "aws-lambda";

export const handler: PreSignUpTriggerHandler = async (
    event: PreSignUpTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    console.log(JSON.stringify(event));

    const { triggerSource } = event;
    if (triggerSource === 'PreSignUp_ExternalProvider') {
        event.response.autoVerifyEmail = true;
        event.userName = event.userName.substr(event.userName.indexOf('_'));
    }

    callback(null, event);
};
