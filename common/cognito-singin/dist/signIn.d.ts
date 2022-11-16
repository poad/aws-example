import { SignInParam, SimpleLogger } from './types';
interface GetCredentialsResult {
    accessKeyId: string | undefined;
    secretKey: string | undefined;
    sessionToken: string | undefined;
    expiration: Date | undefined;
    tokens: {
        idToken: string | undefined;
        refreshToken: string | undefined;
        expiration: number | undefined;
    };
}
type SigninResult = GetCredentialsResult;
export declare const cognitoSignInClient: (initParam: {
    logger?: SimpleLogger;
}) => {
    signIn: (param: SignInParam) => Promise<SigninResult>;
};
export default cognitoSignInClient;
