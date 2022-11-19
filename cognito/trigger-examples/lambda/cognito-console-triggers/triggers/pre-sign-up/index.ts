/* eslint-disable import/prefer-default-export */
import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider';
import {
  Callback, Context, PreSignUpTriggerEvent, PreSignUpTriggerHandler,
} from 'aws-lambda';

export const handler: PreSignUpTriggerHandler = async (
  event: PreSignUpTriggerEvent,
  _: Context,
  callback: Callback<any>,
): Promise<any> => {
  // console.log(JSON.stringify(event));

  const { userPoolId, request, triggerSource } = event;

  if (triggerSource === 'PreSignUp_ExternalProvider') {
    const { userAttributes } = request;
    const { email } = userAttributes;

    const identityProvider = new CognitoIdentityProviderClient({});

    const user = (await identityProvider.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
    }))).Users?.find((u) => u.UserStatus !== 'EXTERNAL_PROVIDER');

    if (user === undefined) {
      return callback('No such link target', event);
    }

    const provider = event.userName.split('_')[0];
    const identities: { [name: string]: string }[] = (user.Attributes || [])
      .filter((attribute) => attribute.Name === 'identities' && attribute.Value !== undefined)
      .flatMap((attribute) => JSON.parse(attribute.Value!) as { [name: string]: string }[]);
    if (identities.find((identity) => identity.providerName !== undefined && identity.providerName === provider) === undefined) {
      return callback('No such link target', event);
    }
    // eslint-disable-next-line no-param-reassign
    event.response.autoVerifyEmail = true;
  }
  return callback(null, event);
};
