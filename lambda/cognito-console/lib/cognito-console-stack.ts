import {
  Effect, FederatedPrincipal, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal, WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, UserPool, CfnIdentityPool,
} from 'aws-cdk-lib/aws-cognito';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';


export interface GroupConfig {
  id: string,
  name: string,
  admin: boolean,
}

export interface CognitoConsoleStackProps extends StackProps {
  name: string,
  region: string,
  environment: string,
  groups: GroupConfig[],
  domain: string,
  auth0Domain?: string,
  providers?: string,
  Lambda: {
    app: {
      signIn: {
        name: string,
        entry: string,
      },
      signOut: {
        name: string,
        entry: string,
      },
      userInfo: {
        name: string,
        entry: string,
      },
    },
    triggers: {
      preSignUp?: {
        name: string,
        entry: string,
      },
      preAuth?: {
        name: string,
        entry: string,
      },
      postAuth?: {
        name: string,
        entry: string,
      },
      defAuthChallenge?: {
        name: string,
        entry: string,
      },
      createAuthChallenge?: {
        name: string,
        entry: string,
      },
      verifyAuthChallenge?: {
        name: string,
        entry: string,
      },
      postConfirm?: {
        name: string,
        entry: string,
      },
      preGenToken?: {
        name: string,
        entry: string,
      },
      customMessge?: {
        name: string,
        entry: string,
      },
      userMigrate?: {
        name: string,
        entry: string,
      },
    }
  },
}

export class CognitoConsoleStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoConsoleStackProps) {
    super(scope, id, props);

    const preSignUpInFn = props.Lambda.triggers.preSignUp !== undefined ?
      new NodejsFunction(this, 'PreSignUpLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.preSignUp.entry,
        functionName: props.Lambda.triggers.preSignUp.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'PreSignUpExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.preSignUp.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;
    if (props.providers !== undefined) {
      preSignUpInFn?.addEnvironment('PROVIDERS', props.providers);
    }

    const postConfirmInFn = props.Lambda.triggers.postConfirm !== undefined ?
      new NodejsFunction(this, 'PostConfirmLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.postConfirm.entry,
        functionName: props.Lambda.triggers.postConfirm.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'PostConfirmLambdaExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.postConfirm.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const preTokenGenInFn = props.Lambda.triggers.preGenToken !== undefined ?
      new NodejsFunction(this, 'PreTokenGenLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.preGenToken.entry,
        functionName: props.Lambda.triggers.preGenToken.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.preGenToken.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const createAuthChallengeFn = props.Lambda.triggers.createAuthChallenge !== undefined ?
      new NodejsFunction(this, 'CreateAuthChallengeLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.createAuthChallenge.entry,
        functionName: props.Lambda.triggers.createAuthChallenge.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'CreateAuthChallengeExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.createAuthChallenge.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const defAuthChallengeFn = props.Lambda.triggers.defAuthChallenge !== undefined ?
      new NodejsFunction(this, 'DefAuthChallengeLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.defAuthChallenge.entry,
        functionName: props.Lambda.triggers.defAuthChallenge.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'DefAuthChallengeExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.defAuthChallenge.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const preAuthFn = props.Lambda.triggers.preAuth !== undefined ?
      new NodejsFunction(this, 'PreAuthLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.preAuth.entry,
        functionName: props.Lambda.triggers.preAuth.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'PreAuthExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.preAuth.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const postAuthFn = props.Lambda.triggers.postAuth !== undefined ?
      new NodejsFunction(this, 'PostAuthLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.postAuth.entry,
        functionName: props.Lambda.triggers.postAuth.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'PostAuthExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.postAuth.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    if (props.providers !== undefined) {
      postAuthFn?.addEnvironment('PROVIDERS', props.providers);
    }

    const verifyAuthChallengeFn = props.Lambda.triggers.verifyAuthChallenge !== undefined ?
      new NodejsFunction(this, 'VerifyAuthChallengeLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.verifyAuthChallenge.entry,
        functionName: props.Lambda.triggers.verifyAuthChallenge.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'VerifyAuthChallengeExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.verifyAuthChallenge.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const customMessageFn = props.Lambda.triggers.customMessge !== undefined ?
      new NodejsFunction(this, 'CustomMessageLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.customMessge.entry,
        functionName: props.Lambda.triggers.customMessge.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'CustomMessageExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.customMessge.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;

    const userMigrationFn = props.Lambda.triggers.userMigrate !== undefined ?
      new NodejsFunction(this, 'UserMigrationLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.userMigrate.entry,
        functionName: props.Lambda.triggers.userMigrate.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        role: new Role(this, 'UserMigrationExecutionRole', {
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
                  resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.triggers.userMigrate.name}:*`],
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
                    ],
                    resources: ['*'],
                  })
                ]
              }
            )
          },
        })
      }) : undefined;


    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${props.environment}-cognito-console-lambda`,
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
        preSignUp: preSignUpInFn,
        postConfirmation: postConfirmInFn,
        preTokenGeneration: preTokenGenInFn,
        createAuthChallenge: createAuthChallengeFn,
        defineAuthChallenge: defAuthChallengeFn,
        preAuthentication: preAuthFn,
        postAuthentication: postAuthFn,
        verifyAuthChallengeResponse: verifyAuthChallengeFn,
        customMessage: customMessageFn,
        userMigration: userMigrationFn
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const domain = props.domain;
    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: domain
      }
    });


    const signInFn = new NodejsFunction(this, 'SignInLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: props.Lambda.app.signIn.entry,
      functionName: props.Lambda.app.signIn.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DOMAIN': domain,
        'REGION': props.region,
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.app.signIn.name}:*`],
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
      entry: props.Lambda.app.signOut.entry,
      functionName: props.Lambda.app.signOut.name,
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.app.signOut.name}:*`],
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

    const userInfoFn = new NodejsFunction(this, 'UserInfoLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: props.Lambda.app.userInfo.entry,
      functionName: props.Lambda.app.userInfo.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      role: new Role(this, 'UserInfoLambdaExecutionRole', {
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.app.userInfo.name}:*`],
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
      apiName: `Cognito Console Lambda API (${props.environment})`,
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        signInFn
      )
    });
    api.addRoutes({
      path: "/signin",
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'signin-handler',
        signInFn
      ),
    });

    api.addRoutes({
      path: "/signout",
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'signout-handler',
        signOutFn
      ),
    });

    api.addRoutes({
      path: "/userInfo",
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'user-info-handler',
        userInfoFn
      ),
    });

    const callbackUrls = props.auth0Domain !== undefined ? [`${api.url}/signin`, `https://${props.auth0Domain}.auth0.com/login/callback`] : [`${api.url!}`];
    const logoutUrls = props.auth0Domain !== undefined ? [`${api.url!}/signout`, `https://${props.auth0Domain}.auth0.com/logout/callback`] : [`${api.url!}`];

    const client = new UserPoolClient(this, 'AppClient', {
      userPool,
      userPoolClientName: `${props.environment}-cognito-lambda`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls,
        logoutUrls,
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

    const identityPoolProvider = {
      clientId: client.userPoolClientId,
      providerName: userPool.userPoolProviderName,
      serverSideTokenCheck: true,
    };
    const identityPool = new CfnIdentityPool(this, 'IdPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        identityPoolProvider,
      ],
      identityPoolName: `${props.environment} signin lambda`,
    });

    signInFn.addEnvironment('CLIENT_ID', client.userPoolClientId);
    signInFn.addEnvironment('USER_POOL_ID', userPool.userPoolId);
    signInFn.addEnvironment('ID_POOL_ID', identityPool.ref);
    signInFn.addEnvironment('IDENTITY_PROVIDER', identityPoolProvider.providerName);
    signInFn.addEnvironment('API_URL', api.url!);

    signOutFn.addEnvironment('CLIENT_ID', client.userPoolClientId);

    userInfoFn.addEnvironment('CLIENT_ID', client.userPoolClientId);

    const unauthenticatedRole = new Role(this, 'CognitoDefaultUnauthenticatedRole', {
      roleName: `${props.environment}-cognito-console-unauth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
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

    const authenticatedRole = new Role(this, 'CognitoDefaultAuthenticatedRole', {
      roleName: `${props.environment}-cognito-console-auth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
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

    new CfnIdentityPoolRoleAttachment(this, 'IdPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
      // roleMappings: {
      //   'cognito-lambda': {
      //     ambiguousRoleResolution: 'AuthenticatedRole',
      //     identityProvider: `cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}:${client.userPoolClientId}`,
      //     type: 'Token',
      //   },
      // },
    });

    const conditions = {
      StringEquals: {
        'cognito-identity.amazonaws.com:aud': identityPool.ref,
      },
      'ForAnyValue:StringLike': {
        'cognito-identity.amazonaws.com:amr': 'authenticated',
      },
    };

    const roles = props.groups.map((group) => {
      const groupRole = new Role(this, `${props.environment}-GroupRole-${group.name}`, {
        roleName: `${props.environment}-cognito-consle-${group.name}`,
        assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', conditions),
        maxSessionDuration: Duration.hours(12),
      });
      if (group.admin) {
        groupRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AdminAccessPolicy', 'arn:aws:iam::aws:policy/AdministratorAccess'));
      }
      groupRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-identity:*',
          "cognito-idp:*",
          'sts:GetFederationToken',
          'sts:AssumeRoleWithWebIdentity',
        ],
        resources: ['*'],
      }));

      return { id: group.id, name: group.name, role: groupRole };
    });
    roles.forEach((role) => {
      new CfnUserPoolGroup(this, role.id, {
        groupName: `${props.environment}-${role.name}`,
        userPoolId: userPool.userPoolId,
        roleArn: role.role.roleArn,
      });
    });
  }
}
