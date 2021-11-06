import { AdminUpdateUserAttributesCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { Callback, Context, PreTokenGenerationTriggerEvent, PreTokenGenerationTriggerHandler } from "aws-lambda";

export const handler: PreTokenGenerationTriggerHandler = async (
    event: PreTokenGenerationTriggerEvent,
    _: Context,
    callback: Callback<any>
): Promise<any> => {
    console.log(JSON.stringify(event));


    const identityProvider = new CognitoIdentityProviderClient({});
    identityProvider.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        UserAttributes: [
            {
                'Name': 'email_verified',
                'Value': 'true'
            }
        ]
    }));
    
    console.log(JSON.stringify(event));
    callback(null, event);
}
