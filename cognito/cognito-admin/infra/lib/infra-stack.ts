import {
  Effect, FederatedPrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal,
} from '@aws-cdk/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, UserPool, CfnIdentityPool,
} from '@aws-cdk/aws-cognito';
import { Stack, StackProps, Construct, Duration, RemovalPolicy } from '@aws-cdk/core';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from '@aws-cdk/aws-lambda';



export interface InfraStackStackProps extends StackProps {
  name: string,
  adminUserPool: string,
  endUserPool: string,
  region: string,
  environment: string,
  domain: string,
  endUserDomain: string,
  provider: string,
  Lambda: {
    app: {
      userMaagement: {
        name: string,
        entry: string,
      },
    },
  },
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraStackStackProps) {
    super(scope, id, props);

    const blockExternalUserFn = new NodejsFunction(this, 'BlockExternalUserLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/block-external-user/index.ts',
      functionName: `${props.environment}-cognito-admin-block-external-user`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      role: new Role(this, 'BlockExternalUserExecutionRole', {
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
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${props.environment}-cognito-admin-block-external-user`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${props.environment}-cognito-admin-block-external-user:*`,
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
          )
        },
      })
    });

    const endUserPool = new UserPool(this, props.endUserPool, {
      userPoolName: props.endUserPool,
      signInAliases: {
        username: true,
        email: true,
        preferredUsername: false,
        phone: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
        },
        preferredUsername: {
          required: false,
        },
        phoneNumber: {
          required: false,
        },
      },
      mfa: Mfa.OPTIONAL,
      passwordPolicy: {
        minLength: 6,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        preSignUp: blockExternalUserFn,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    endUserPool.addDomain('EndUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: props.endUserDomain
      }
    });

    const addAdminUserFn = new NodejsFunction(this, 'AddAdminUserLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/add-admin-user/index.ts',
      functionName: `${props.environment}-cognito-admin-add-admin-user`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DEST_USER_POOL_ID': endUserPool.userPoolId,
        'PROVIDER': props.provider,
      },
      role: new Role(this, 'AddAdminUserExecutionRole', {
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
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${props.environment}-cognito-admin-add-admin-user`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${props.environment}-cognito-admin-add-admin-user:*`,
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
          )
        },
      })
    });

    const adminUserPool = new UserPool(this, props.adminUserPool, {
      userPoolName: props.adminUserPool,
      signInAliases: {
        username: true,
        email: true,
        preferredUsername: false,
        phone: false,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
        },
        preferredUsername: {
          required: false,
        },
        phoneNumber: {
          required: false,
        },
      },
      mfa: Mfa.OPTIONAL,
      passwordPolicy: {
        minLength: 6,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      lambdaTriggers: {
        postAuthentication: addAdminUserFn,

      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    adminUserPool.addDomain('AdminnUserPoolDomain', {
      cognitoDomain: {
        domainPrefix: props.domain
      }
    });

    const adminPoolClient = new UserPoolClient(this, 'AdminPoolAppClient', {
      userPool: adminUserPool,
      userPoolClientName: `${props.environment}-admin-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: ['http://localhost:3000', `https://${props.endUserDomain}.auth.${props.region}.amazoncognito.com/oauth2/idpresponse`],
        // logoutUrls,
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          OAuthScope.COGNITO_ADMIN,
          OAuthScope.EMAIL,
          OAuthScope.OPENID,
          OAuthScope.PROFILE,
        ],
      },
      preventUserExistenceErrors: true,
    });


    const adminPoolIdentityPool = new CfnIdentityPool(this, 'AdminIdPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: adminPoolClient.userPoolClientId,
          providerName: adminUserPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
      identityPoolName: `${props.environment} admin users`,
    });

    const adminUnauthenticatedRole = new Role(this, 'AdminCognitoDefaultUnauthenticatedRole', {
      roleName: `${props.environment}-cognito-admin-users-unauth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': adminPoolIdentityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
      inlinePolicies: {
        'allow-assume-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-identity:*',
                "cognito-idp:*",
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
              ],
              resources: ['*'],
            })
          ]
        })
      }
    });

    const adminAuthenticatedRole = new Role(this, 'AdminCognitoDefaultAuthenticatedRole', {
      roleName: `${props.environment}-cognito-admin-users-auth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': adminPoolIdentityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
      maxSessionDuration: Duration.hours(12),
      inlinePolicies: {
        'allow-assume-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-identity:*',
                "cognito-idp:*",
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
                'iam:ListRoles',
              ],
              resources: ['*'],
            })
          ]
        })
      }
    });

    new CfnIdentityPoolRoleAttachment(this, 'AdminIdPoolRoleAttachment', {
      identityPoolId: adminPoolIdentityPool.ref,
      roles: {
        authenticated: adminAuthenticatedRole.roleArn,
        unauthenticated: adminUnauthenticatedRole.roleArn,
      },
    });


    const endUsersClient = new UserPoolClient(this, 'EndUserPoolAppClient', {
      userPool: endUserPool,
      userPoolClientName: `${props.environment}-end-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: ['http://localhost:3000'],
        // logoutUrls,
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          OAuthScope.COGNITO_ADMIN,
          OAuthScope.EMAIL,
          OAuthScope.OPENID,
          OAuthScope.PROFILE,
        ],
      },
      preventUserExistenceErrors: true,
    });

    const endUserPoolIdentityPool = new CfnIdentityPool(this, 'EndUserIdPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: endUsersClient.userPoolClientId,
          providerName: endUserPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
      identityPoolName: `${props.environment} end users`,
    });

    const endUserUnauthenticatedRole = new Role(this, 'EndUserCognitoDefaultUnauthenticatedRole', {
      roleName: `${props.environment}-cognito-end-users-unauth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': endUserPoolIdentityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'unauthenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
      inlinePolicies: {
        'allow-assume-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-identity:*',
                "cognito-idp:*",
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
              ],
              resources: ['*'],
            })
          ]
        })
      }
    });

    const endUserAuthenticatedRole = new Role(this, 'EndUserCognitoDefaultAuthenticatedRole', {
      roleName: `${props.environment}-cognito-end-users-auth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': endUserPoolIdentityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
      maxSessionDuration: Duration.hours(12),
      inlinePolicies: {
        'allow-assume-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'cognito-identity:*',
                "cognito-idp:*",
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
              ],
              resources: ['*'],
            })
          ]
        })
      }
    });

    new CfnIdentityPoolRoleAttachment(this, 'EndUsersIdPoolRoleAttachment', {
      identityPoolId: endUserPoolIdentityPool.ref,
      roles: {
        authenticated: endUserAuthenticatedRole.roleArn,
        unauthenticated: endUserUnauthenticatedRole.roleArn,
      },
    });
  }
}
