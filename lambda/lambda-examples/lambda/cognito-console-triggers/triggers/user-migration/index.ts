// import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
  Callback, Context, UserMigrationTriggerEvent, UserMigrationTriggerHandler,
} from 'aws-lambda';

// eslint-disable-next-line import/prefer-default-export
export const handler: UserMigrationTriggerHandler = async (
  event: UserMigrationTriggerEvent,
  _: Context,
  callback: Callback<any>,
): Promise<any> => {
  console.log(JSON.stringify(event));

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
