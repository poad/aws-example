import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as iam from '@aws-cdk/aws-iam';
import { AccountRecovery, ClientAttributes, Mfa, OAuthScope, UserPoolIdentityProvider } from '@aws-cdk/aws-cognito';
import { Duration } from '@aws-cdk/core';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from '@aws-cdk/aws-iam';
import { Runtime } from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';

interface CognitoSamlNextJsStackProps extends cdk.StackProps {
  environment: string,
  domain: string,
  identityProviderMetadataURL?: string,
  callbackUrls?: string[],
  logoutUrls?: string[],
}

export class CognitoSamlNextJsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CognitoSamlNextJsStackProps) {
    super(scope, id, props);

    const { environment, domain, identityProviderMetadataURL, callbackUrls, logoutUrls } = props;

    const preTokenGenFunctionName = `${environment}-cognito-saml-pre-token-gen-trigger`;
    const preTokenGenTriggerFn = new NodejsFunction(this, 'PreTokenGenLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/preTokenGen/index.ts',
      functionName: preTokenGenFunctionName,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        REGION: this.region,
      },
      role: new Role(this, 'PreTokenGenLambdaExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents'
                ],
                resources: [
                  `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${preTokenGenFunctionName}`,
                  `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${preTokenGenFunctionName}:*`,
                ],
              })
            ]
          }),
          'assumed-role-policy': new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    'cognito-identity:*',
                    'cognito-idp:*',
                  ],
                  resources: ['*'],
                })
              ]
            }
          ),
        },
      })
    });

    const userPool = new cognito.UserPool(this, `CognitoSamlUserPool`, {
      userPoolName: `${environment}-cognito-saml-user-pool`,
      signInAliases: {
        username: false,
        email: true,
        preferredUsername: false,
        phone: false
      },
      autoVerify: {
        email: true
      },
      lambdaTriggers: {
        preTokenGeneration: preTokenGenTriggerFn,
      },
      standardAttributes: {
        email: {
          required: true
        },
        preferredUsername: {
          required: false
        },
        phoneNumber: {
          required: false
        }
      },
      mfa: Mfa.OFF,
      passwordPolicy: {
        minLength: 8
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY
    });

    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: domain
      }
    });

    const idpName = identityProviderMetadataURL ? 
      new cognito.CfnUserPoolIdentityProvider(this, "CfnCognitoSamlIdPAzureAD", {
      providerName: 'AzureAD',
      providerDetails: {
        MetadataURL: identityProviderMetadataURL
      },
      providerType: "SAML",
      attributeMapping: {
        "email": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
        "family_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
        "given_name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
        "name": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "username": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "preferredUsername": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
      },
      userPoolId: userPool.userPoolId
    }).providerName : undefined;

    if (idpName !== undefined) {
      cognito.UserPoolClientIdentityProvider.custom(idpName);
      userPool.registerIdentityProvider(
        UserPoolIdentityProvider.fromProviderName(this, 'CognitoSamlIdPAzureAD', idpName));
    }

    const client = new cognito.UserPoolClient(this, 'CognitoSamlAppClient', {
      userPool: userPool,
      userPoolClientName: `${environment}-cognito-saml`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true
      },
      oAuth: {
        callbackUrls,
        logoutUrls,
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true
        },
        scopes: [
          OAuthScope.COGNITO_ADMIN,
          OAuthScope.EMAIL,
          OAuthScope.OPENID,
          OAuthScope.PROFILE
        ]
      },
      readAttributes: new ClientAttributes().withStandardAttributes({
        email: true,
        familyName: true,
        givenName: true,
        fullname: true,
        preferredUsername: true,
        emailVerified: true,
        profilePage: true,
      }),
      writeAttributes: new ClientAttributes().withStandardAttributes({
        email: true,
        familyName: true,
        givenName: true,
        fullname: true,
        preferredUsername: true,
        profilePage: true,
      }),
    });

    const identityPoolProvider = {
      clientId: client.userPoolClientId,
      providerName: userPool.userPoolProviderName,
    };
    const identityPool = new cognito.CfnIdentityPool(this, 'CognitoSamlIdPool', {
      allowUnauthenticatedIdentities: false,
      allowClassicFlow: true,
      cognitoIdentityProviders: [
        identityPoolProvider
      ],
      identityPoolName: `${environment} Cognito SAML idp`
    });
    
    // TODO https://github.com/aws/aws-cdk/issues/2041 sts:TagSession support

    const unauthenticatedRole = new iam.Role(this, 'CognitoDefaultUnauthenticatedRole', {
      roleName: `${environment}-console-unauth-role`,
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "unauthenticated"
        },
      }, "sts:AssumeRoleWithWebIdentity"),
      maxSessionDuration: Duration.hours(12),
    });

    unauthenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-sync:*",
        "cognito-identity:*",
      ],
      resources: ["*"],
    }));
    unauthenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "sts:*",
      ],
      resources: ["*"],
    }));

    const authenticatedRole = new iam.Role(this, 'CognitoDefaultAuthenticatedRole', {
      roleName: `${environment}-console-auth-role`,
      assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
        "StringEquals": {
          "cognito-identity.amazonaws.com:aud": identityPool.ref
        },
        "ForAnyValue:StringLike": {
          "cognito-identity.amazonaws.com:amr": "authenticated"
        },
      }, "sts:AssumeRoleWithWebIdentity"),
      maxSessionDuration: Duration.hours(12),
    });
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "cognito-sync:*",
        "cognito-identity:*",
      ],
      resources: ["*"],
    }));
    authenticatedRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "sts:*"
      ],
      resources: ["*"],
    }));

    new cognito.CfnIdentityPoolRoleAttachment(this, 'CognitoSamlIdPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        "authenticated": authenticatedRole.roleArn,
        "unauthenticated": unauthenticatedRole.roleArn
      },
    });

    const conditions = {
      "StringEquals": {
        "cognito-identity.amazonaws.com:aud": identityPool.ref
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated"
      },
    };

  }
}
