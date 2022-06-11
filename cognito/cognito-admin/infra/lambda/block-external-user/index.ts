import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PreSignUpTriggerEvent, PreSignUpTriggerHandler } from "aws-lambda";
import { StringMap } from "aws-lambda/trigger/cognito-user-pool-trigger/_common";
import * as log4js from 'log4js';

log4js.configure({
    appenders: {
        out: {
            type: 'stdout',
            layout: {
                type: 'pattern',
                pattern: '%m%n',
            },
        },
    },
    categories: { default: { appenders: ['out'], level: 'info' } },
});
const logger = log4js.getLogger();

export const handler: PreSignUpTriggerHandler = async (
    event: PreSignUpTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    logger.trace(JSON.stringify(event));

    const { userPoolId, request, triggerSource } = event;

    if (triggerSource === 'PreSignUp_ExternalProvider') {
        const { userAttributes } = request;
        const { email } = userAttributes;

        const identityProvider = new CognitoIdentityProviderClient({});

        const user = (await identityProvider.send(new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `email = \"${email}\"`
        }))).Users?.find((user) => user.UserStatus !== "EXTERNAL_PROVIDER");

        if (!user) {
            logger.debug(`No such link target. not found ${email}`);
            return callback(`No such link target. not found ${email}`, event);
        }

        const provider = event.userName.split('_')[0];
        const identities: StringMap[] = user.Attributes !== undefined ? user.Attributes
                .filter(attribute => attribute.Name === 'identities' && attribute.Value !== undefined)
                .flatMap(attribute => {
                    return JSON.parse(attribute.Value!) as StringMap[]
                }) : [] as StringMap[];
        if (identities.find((identity) => identity.providerName !== undefined && identity.providerName !== provider) === undefined) {
            logger.debug(`No such link target. identities ${JSON.stringify(identities)}`);
            return callback(`No such link target. identities ${JSON.stringify(identities)}`, event);
        }
        event.response.autoVerifyEmail = true;

    }

    callback(null, event);
}
