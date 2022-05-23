import {
  AccountRecovery, CfnIdentityPool, CfnIdentityPoolRoleAttachment, Mfa, OAuthScope, UserPool, UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import {
  Effect, FederatedPrincipal, PolicyDocument, PolicyStatement, Role, ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Table, AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import assert from 'node:assert';
import { Construct } from 'constructs';

export interface TinyDeviceFlowStackStackProps extends cdk.StackProps {
  name: string,
  userPool: string,
  region: string,
  environment: string,
  domain: string,
  responseType?: string,
  identityProvider?: string,
  scopes: {
    phone: boolean,
    email: boolean,
    openid: boolean,
    profile: boolean,
    'aws.cognito.signin.user.admin': boolean
  },
}

export class TinyDeviceFlowStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TinyDeviceFlowStackStackProps) {
    super(scope, id, props);

    const api = new HttpApi(this, 'HttpApi', {
      apiName: `Device Authentication Flow API (${props.environment})`,
    });

    const userPool = new UserPool(this, props.userPool, {
      userPoolName: props.userPool,
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
      removalPolicy: RemovalPolicy.DESTROY,
    });

    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: props.domain,
      },
    });

    const appClient = new UserPoolClient(this, 'AppClient', {
      userPool,
      userPoolClientName: `${props.name}-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: [`${api.url}oauth/process/index.html`, `${api.url}oauth/complete`],
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

    const userPoolIdentityPool = new CfnIdentityPool(this, 'IdPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: appClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
      identityPoolName: `${props.environment} users`,
    });

    const userUnauthenticatedRole = new Role(this, 'UserCognitoDefaultUnauthenticatedRole', {
      roleName: `${props.name}-unauth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': userPoolIdentityPool.ref,
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
                'cognito-idp:*',
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const userAuthenticatedRole = new Role(this, 'UserCognitoDefaultAuthenticatedRole', {
      roleName: `${props.name}-auth-role`,
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': userPoolIdentityPool.ref,
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
                'cognito-idp:*',
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // eslint-disable-next-line no-new
    new CfnIdentityPoolRoleAttachment(this, 'UsersIdPoolRoleAttachment', {
      identityPoolId: userPoolIdentityPool.ref,
      roles: {
        authenticated: userAuthenticatedRole.roleArn,
        unauthenticated: userUnauthenticatedRole.roleArn,
      },
    });

    const deviceCodeTable = new Table(this, 'DeveiceCodeTable', {
      tableName: `${props.name}-device-code`,
      partitionKey: {
        name: 'device_code',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'user_code',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'expire',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const s3bucket = new s3.Bucket(this, 'S3Bucket', {
      bucketName: `${props.name}-static-site`,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
      accessControl: s3.BucketAccessControl.PRIVATE,
      publicReadAccess: false,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.POST],
          allowedOrigins: ['*'],
        },
      ],
    });

    // eslint-disable-next-line no-new
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(`${process.cwd()}/pages/out`)],
      destinationBucket: s3bucket,
      destinationKeyPrefix: 'web/static', // optional prefix in destination bucket
    });

    const resourceEndpointFnName = `${props.name}-resource-endpoint`;
    const resourceEndpointFn = new NodejsFunction(this, 'ResourceEndpointLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/resource-endpoint/index.ts',
      functionName: resourceEndpointFnName,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          'aws-sdk',
          'node',
        ],
        buildArgs: {
          '--bundle': '',
          '--platform': 'node',
          '--format': 'cjs',
        },
      },
      environment: {
        REGION: props.region,
        BUCKET_NAME: s3bucket.bucketName,
        PATH_PREFIX: 'web/static',
      },
      role: new Role(this, 'ResourceEndpointLambdaExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${resourceEndpointFnName}`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${resourceEndpointFnName}:*`,
                ],
              }),
            ],
          }),
          's3-role-policy': new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:GetAccountPublicAccessBlock',
                    's3:GetBucketAcl',
                    's3:GetBucketLocation',
                    's3:GetBucketPolicyStatus',
                    's3:GetBucketPublicAccessBlock',
                    's3:ListAllMyBuckets',
                  ],
                  resources: [
                    '*',
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:ListBucket',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:Get*',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                    `${s3bucket.bucketArn}/*`,
                  ],
                }),
              ],
            },
          ),
        },
      }),
    });

    const deviceCodeEndpointFnName = `${props.name}-device-code-endpoint`;
    const deviceCodeEndpointFn = new NodejsFunction(this, 'DeviceCodeEndpointLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/device-code-endpoint/index.ts',
      functionName: deviceCodeEndpointFnName,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          'aws-sdk',
          'node',
        ],
        buildArgs: {
          '--bundle': '',
          '--platform': 'node',
          '--format': 'cjs',
        },
      },
      environment: {
        REGION: props.region,
        TABLE_NAME: deviceCodeTable.tableName,
        CLIENT_ID: appClient.userPoolClientId,
        EXPIRE_IN_SEC: '300',
        VERIFICATION_URI: `${api.url!}oauth/device/activate`,
      },
      role: new Role(this, 'DeviceCodeEndpointExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${deviceCodeEndpointFnName}`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${deviceCodeEndpointFnName}:*`,
                ],
              }),
            ],
          }),
        },
      }),
    });

    const tokenEndpointFnName = `${props.name}-token-endpoint`;
    const tokenEndpointFn = new NodejsFunction(this, 'TokenEndpointLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/token-endpoint/index.ts',
      functionName: tokenEndpointFnName,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        REGION: props.region,
        TABLE_NAME: deviceCodeTable.tableName,
        CLIENT_ID: appClient.userPoolClientId,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          'aws-sdk',
          'node',
        ],
        buildArgs: {
          '--bundle': '',
          '--platform': 'node',
          '--format': 'cjs',
        },
      },
      role: new Role(this, 'TokenEndpointLambdaExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${tokenEndpointFnName}`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${tokenEndpointFnName}:*`,
                ],
              }),
            ],
          }),
        },
      }),
    });

    const { responseType, identityProvider, scopes } = props;

    const availableScopes = Object.entries(scopes)
      // eslint-disable-next-line no-shadow
      .filter((scope) => scope[1])
      // eslint-disable-next-line no-shadow
      .map((scope) => scope[0]);
    assert(availableScopes.length > 0, 'The scopes must have at least one true entry.');

    const scopeParam = Object.entries(scopes)
      // eslint-disable-next-line no-shadow
      .filter((scope) => scope[1])
      // eslint-disable-next-line no-shadow
      .map((scope) => scope[0])
      .reduce((acc, cur) => `${acc}+${cur}`);
    const activateEndpointFnName = `${props.name}-activate-endpoint`;
    const activateEndpointFn = new NodejsFunction(this, 'ActivateEndpointLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/activate-endpoint/index.ts',
      functionName: activateEndpointFnName,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          'aws-sdk',
          'node',
        ],
        buildArgs: {
          '--bundle': '',
          '--platform': 'node',
          '--format': 'cjs',
        },
      },
      environment: {
        REGION: props.region,
        BUCKET_NAME: s3bucket.bucketName,
        TABLE_NAME: deviceCodeTable.tableName,
        DOMAIN: props.domain,
        AUTHORIZE_ENDPOINT: `https://${props.domain}.auth.${props.region}.amazoncognito.com/oauth2/authorize`,
        CLIENT_ID: appClient.userPoolClientId,
        REDIRECT_URI: responseType === 'token' ? `${api.url}oauth/process/index.html` : `${api.url}oauth/complete`,
        PATH_PREFIX: 'web/static',
        RESPONSE_TYPE: responseType || 'code',
        IDENTITY_PROVIDER: identityProvider || 'COGNITO',
        SCOPE: scopeParam === '' ? 'openid' : scopeParam,
      },
      role: new Role(this, 'ActivateEndpointLambdaExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${activateEndpointFnName}`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${activateEndpointFnName}:*`,
                ],
              }),
            ],
          }),
          's3-role-policy': new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:GetAccountPublicAccessBlock',
                    's3:GetBucketAcl',
                    's3:GetBucketLocation',
                    's3:GetBucketPolicyStatus',
                    's3:GetBucketPublicAccessBlock',
                    's3:ListAllMyBuckets',
                  ],
                  resources: [
                    '*',
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:ListBucket',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:Get*',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                    `${s3bucket.bucketArn}/*`,
                  ],
                }),
              ],
            },
          ),
        },
      }),
    });

    const activateCompleteEndpointFnName = `${props.name}-activate-complete-endpoint`;
    const activateCompleteEndpointFn = new NodejsFunction(this, 'ActivateCompleteEndpointLambdaFunction', {
      runtime: Runtime.NODEJS_14_X,
      entry: 'lambda/activate-complete-endpoint/index.ts',
      functionName: activateCompleteEndpointFnName,
      logRetention: RetentionDays.ONE_DAY,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: [
          'aws-sdk',
          'node',
        ],
        buildArgs: {
          '--bundle': '',
          '--platform': 'node',
          '--format': 'cjs',
        },
      },
      retryAttempts: 0,
      environment: {
        REGION: props.region,
        BUCKET_NAME: s3bucket.bucketName,
        TABLE_NAME: deviceCodeTable.tableName,
        DOMAIN: props.domain,
        CLIENT_ID: appClient.userPoolClientId,
        REDIRECT_URI: `${api.url}oauth/complete`,
        RETRY_URI: `${api.url}oauth/device/activate`,
        PATH_PREFIX: 'web/static',
        RESPONSE_TYPE: responseType || 'code',
      },
      role: new Role(this, 'ActivateCompleteEndpointLambdaExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${activateCompleteEndpointFnName}`,
                  `arn:aws:logs:${props.region}:${this.account}:log-group:/aws/lambda/${activateCompleteEndpointFnName}:*`,
                ],
              }),
            ],
          }),
          's3-role-policy': new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:GetAccountPublicAccessBlock',
                    's3:GetBucketAcl',
                    's3:GetBucketLocation',
                    's3:GetBucketPolicyStatus',
                    's3:GetBucketPublicAccessBlock',
                    's3:ListAllMyBuckets',
                  ],
                  resources: [
                    '*',
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:ListBucket',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                  ],
                }),
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    's3:Get*',
                  ],
                  resources: [
                    `${s3bucket.bucketArn}`,
                    `${s3bucket.bucketArn}/*`,
                  ],
                }),
              ],
            },
          ),
        },
      }),
    });

    [deviceCodeEndpointFn, tokenEndpointFn, activateEndpointFn, activateCompleteEndpointFn].forEach((fn) => deviceCodeTable.grantReadWriteData(fn));

    api.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'proxy-handler',
        resourceEndpointFn,
      ),
    });

    api.addRoutes({
      path: '/oauth/device/code',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'code-handler',
        deviceCodeEndpointFn,
      ),
    });

    api.addRoutes({
      path: '/oauth/token',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'token-handler',
        tokenEndpointFn,
      ),
    });

    api.addRoutes({
      path: '/oauth/device/activate',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'activate-handler',
        activateEndpointFn,
      ),
    });
    api.addRoutes({
      path: '/oauth/device/activate/{proxy+}',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'activate-proxy-handler',
        activateEndpointFn,
      ),
    });

    api.addRoutes({
      path: '/oauth/complete',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'complete-handler',
        activateCompleteEndpointFn,
      ),
    });
    api.addRoutes({
      path: '/oauth/complete/{proxy+}',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        'complete-proxy-handler',
        activateCompleteEndpointFn,
      ),
    });
  }
}
