import {
  Effect, FederatedPrincipal, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal, WebIdentityPrincipal,
} from '@aws-cdk/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, UserPool, CfnIdentityPool,
} from '@aws-cdk/aws-cognito';
import { Stack, StackProps, Construct, Duration, RemovalPolicy } from '@aws-cdk/core';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { NodejsFunction } from '@aws-cdk/aws-lambda-nodejs';
import { Runtime } from '@aws-cdk/aws-lambda';


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
  Lambda: {
    app: {
      name: string,
      entry: string,
    },
    triggers: {
      postConfirm?: {
        name: string,
        entry: string,
      },
    }
  },
}

export class CognitoConsoleStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoConsoleStackProps) {
    super(scope, id, props);

    const signpostConfirmInFn = props.Lambda.triggers.postConfirm !== undefined ?
      new NodejsFunction(this, 'PostConfirmLambdaFunction', {
        runtime: Runtime.NODEJS_14_X,
        entry: props.Lambda.triggers.postConfirm.entry,
        functionName: props.Lambda.triggers.postConfirm.name,
        logRetention: RetentionDays.ONE_DAY,
        retryAttempts: 0,
        environment: {
          'REGION': props.region,
        },
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
        postConfirmation: signpostConfirmInFn,
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
      entry: props.Lambda.app.entry,
      functionName: props.Lambda.app.name,
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.Lambda.app.name}:*`],
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
      defaultIntegration: new LambdaProxyIntegration({
        handler: signInFn
      })
    });
    api.addRoutes({
      path: "/",
      methods: [HttpMethod.ANY],
      integration: new LambdaProxyIntegration({
        handler: signInFn
      }),
    });

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
        callbackUrls: [`${api.url}`],
        logoutUrls: [api.url!],
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
