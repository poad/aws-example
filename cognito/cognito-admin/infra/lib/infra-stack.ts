import {
  Effect, FederatedPrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, UserPool, CfnIdentityPool, CfnUserPoolIdentityProvider, UserPoolClientIdentityProvider,
} from 'aws-cdk-lib/aws-cognito';
import { Stack, StackProps, Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { HttpApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { HttpMethod } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { IdentityProviderTypeType } from '@aws-sdk/client-cognito-identity-provider';


export interface InfraStackStackProps extends StackProps {
  adminUserPool: string,
  endUserPool: string,
  region: string,
  environment: string,
  domain: string,
  endUserDomain: string,
  provider: string,
  lambda: {
    app: {
      userMaagement: {
        name: string,
        entry: string,
      },
    },
  },
  groupRoleClassificationTag: {
    name: string | undefined,
    value: string | undefined
  },
  testRoles: number | undefined,
}

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props: InfraStackStackProps) {
    super(scope, id, props);

    const {
      adminUserPool: adminUserPoolName,
      endUserPool: endUserPoolName,
      region,
      environment,
      domain,
      endUserDomain,
      provider,
      groupRoleClassificationTag,
      testRoles
    } = props;


    const signInFn = new NodejsFunction(this, 'SignInLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/signin/index.ts',
      functionName: `${environment}-cognito-admin-user-console-sign-in`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DOMAIN': endUserDomain,
        'REGION': region,
      },
      role: new Role(this, 'SignInLambdaExecutionRole', {
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-user-console-sign-in:*`],
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
                    "cognito-idp:*",
                    'sts:GetFederationToken',
                    'sts:AssumeRoleWithWebIdentity',
                  ],
                  resources: ['*'],
                })
              ]
            }
          )
        },
      })
    });

    const signOutFn = new NodejsFunction(this, 'SignOutLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/signout/index.ts',
      functionName: `${environment}-cognito-admin-user-console-sign-out`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      role: new Role(this, 'SignOutLambdaExecutionRole', {
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-user-console-sign-out:*`],
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
                    "cognito-idp:*",
                    'sts:GetFederationToken',
                    'sts:AssumeRoleWithWebIdentity',
                  ],
                  resources: ['*'],
                })
              ]
            }
          )
        },
      })
    });

    const api = new HttpApi(this, "HttpApi", {
      apiName: `Cognito Console Lambda API (${environment})`,
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        signInFn
      )
    });
    api.addRoutes({
      path: "/signin",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'signin-handler',
        signInFn
      ),
    });

    api.addRoutes({
      path: "/signout",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'signout-handler',
        signOutFn
      ),
    });

    const blockExternalUserFn = new NodejsFunction(this, 'BlockExternalUserLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/block-external-user/index.ts',
      functionName: `${environment}-cognito-admin-block-external-user`,
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
                  `arn:aws:logs:${region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-block-external-user`,
                  `arn:aws:logs:${region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-block-external-user:*`,
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

    const endUserPool = new UserPool(this, endUserPoolName, {
      userPoolName: endUserPoolName,
      signInAliases: {
        username: true,
        email: true,
        preferredUsername: false,
        phone: false,
      },
      autoVerify: {
        email: true,
        phone: false,
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
      enableSmsRole: false,
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
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
        domainPrefix: endUserDomain
      }
    });

    const addAdminUserFn = new NodejsFunction(this, 'AddAdminUserLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/add-admin-user/index.ts',
      functionName: `${environment}-cognito-admin-add-admin-user`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DEST_USER_POOL_ID': endUserPool.userPoolId,
        'PROVIDER': provider,
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
                  `arn:aws:logs:${region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-add-admin-user`,
                  `arn:aws:logs:${region}:${this.account}:log-group:/aws/lambda/${environment}-cognito-admin-add-admin-user:*`,
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

    const adminUserPool = new UserPool(this, adminUserPoolName, {
      userPoolName: adminUserPoolName,
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
      enableSmsRole: false,
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
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
        domainPrefix: domain
      }
    });

    const adminPoolClient = new UserPoolClient(this, 'AdminPoolAppClient', {
      userPool: adminUserPool,
      userPoolClientName: `${environment}-admin-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: ['http://localhost:3000', `https://${endUserDomain}.auth.${region}.amazoncognito.com/oauth2/idpresponse`],
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
      identityPoolName: `${environment} admin users`,
    });

    const adminUnauthenticatedRole = new Role(this, 'AdminCognitoDefaultUnauthenticatedRole', {
      roleName: `${environment}-cognito-admin-users-unauth-role`,
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
      roleName: `${environment}-cognito-admin-users-auth-role`,
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
                'iam:PassRole',
                'iam:GetRole',
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

    const cfnIdp = new CfnUserPoolIdentityProvider(this, 'OIDCProvider', {
      providerName: provider,
      providerType: IdentityProviderTypeType.OIDC,
      userPoolId: endUserPool.userPoolId,
      providerDetails: {
        client_id: adminPoolClient.userPoolClientId,
        authorize_scopes: 'email openid profile',
        oidc_issuer: `https://cognito-idp.${region}.amazonaws.com/${adminUserPool.userPoolId}`,
        attributes_request_method: 'GET',
      },
      attributeMapping: {
        'email': 'email'
      }
    });

    cfnIdp.node.addDependency(adminPoolClient, endUserPool);    

    const endUsersClient = new UserPoolClient(this, 'EndUserPoolAppClient', {
      userPool: endUserPool,
      userPoolClientName: `${environment}-end-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: ['http://localhost:3000', `${api.url}signin`],
        logoutUrls: [`${api.url}signout`],
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
      supportedIdentityProviders: [
        UserPoolClientIdentityProvider.COGNITO,
        UserPoolClientIdentityProvider.custom(cfnIdp.providerName)
      ],
    });

    endUsersClient.node.addDependency(endUserPool, cfnIdp);

    const endUserPoolIdentityPool = new CfnIdentityPool(this, 'EndUserIdPool', {
      allowUnauthenticatedIdentities: false,
      allowClassicFlow: true,
      cognitoIdentityProviders: [
        {
          clientId: endUsersClient.userPoolClientId,
          providerName: endUserPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
      identityPoolName: `${environment} end users`,
    });

    const endUserUnauthenticatedRole = new Role(this, 'EndUserCognitoDefaultUnauthenticatedRole', {
      roleName: `${environment}-cognito-end-users-unauth-role`,
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
      roleName: `${environment}-cognito-end-users-auth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': endUserPoolIdentityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity').withSessionTags(),
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

    if (testRoles !== undefined && testRoles > 0) {
      for (let i = 0; i < testRoles; i++) {
        const roleName = `${environment}-test-group-role-${i + 1}`;

        const groupRole = new Role(this, `TestGroupRole${i + 1}`, {
          roleName,
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

        signInFn.addEnvironment('USER_POOL_ID', endUserPool.userPoolId);
        signInFn.addEnvironment('CLIENT_ID', endUsersClient.userPoolClientId);
        signInFn.addEnvironment('ID_POOL_ID', endUserPoolIdentityPool.ref);
        signInFn.addEnvironment('IDENTITY_PROVIDER', endUserPool.userPoolProviderName);
        signInFn.addEnvironment('API_URL', api.url!);

        if (groupRoleClassificationTag.name !== undefined && groupRoleClassificationTag.value !== undefined) {
          Tags.of(groupRole).add(groupRoleClassificationTag.name, groupRoleClassificationTag.value)
        }
      }
    }
  }
}
