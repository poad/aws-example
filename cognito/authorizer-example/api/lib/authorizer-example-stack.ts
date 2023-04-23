import { WebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  CognitoUserPoolsAuthorizer, Cors, EndpointType, GatewayResponse, LambdaIntegration, ResponseType, RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import {
  AccountRecovery, CfnIdentityPool, CfnIdentityPoolRoleAttachment, Mfa, OAuthScope, UserPool, UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import {
  Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect, FederatedPrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AuthorizerExampleStackProps extends cdk.StackProps {
  environment: string,
  userPoolName: string,
  callbackUrls?: string[],
  logoutUrls?: string[],
}

export class AuthorizerExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AuthorizerExampleStackProps) {
    super(scope, id, props);

    const {
      environment, userPoolName, callbackUrls, logoutUrls,
    } = props;

    const userPoolDomain = ssm.StringParameter.valueForStringParameter(this, `/${environment}/lambda-authorizer-example/UserPoolDomain`);

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${environment}-${userPoolName}`,
      selfSignUpEnabled: true,
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
      removalPolicy: RemovalPolicy.DESTROY,
    });

    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: userPoolDomain,
      },
    });

    const userPoolClient = new UserPoolClient(this, 'UserPoolAppClient', {
      userPool,
      userPoolClientName: `${environment}-authorizer-user-pool-client`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: [
          'http://localhost:3000',
          `https://${userPoolDomain}.auth.${this.region}.amazoncognito.com/oauth2/idpresponse`,
          ...(callbackUrls || []),
        ],
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

    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
          serverSideTokenCheck: true,
        },
      ],
      identityPoolName: `${environment} users for authorizer`,
    });

    const unauthenticatedRole = new Role(this, 'CognitoDefaultUnauthenticatedRole', {
      roleName: `${environment}-cognito-users-authorizer-unauth-role`,
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

    const authenticatedRole = new Role(this, 'CognitoDefaultAuthenticatedRole', {
      roleName: `${environment}-cognito-users-authorizer-auth-role`,
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
                'cognito-idp:*',
                'sts:GetFederationToken',
                'sts:AssumeRoleWithWebIdentity',
                'iam:ListRoles',
                'iam:PassRole',
                'iam:GetRole',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    // eslint-disable-next-line no-new
    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
    });

    const restFunctionName = `${environment}-authorizer-example-api-gateway-rest`;
    const restFunctionLogs = new LogGroup(this, 'AuthorizerExampleRestLambdaFunctionLogGroup', {
      logGroupName: `/aws/lambda/${restFunctionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
    });

    const restFunction = new NodejsFunction(this, 'AuthorizerExampleLambdaRestFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/rest/index.ts',
      functionName: restFunctionName,
      retryAttempts: 0,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        sourceMapMode: SourceMapMode.BOTH,
        sourcesContent: true,
        keepNames: true,
      },
      role: new Role(this, 'AuthorizerExampleLambdaRestFunctionExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [`${restFunctionLogs.logGroupArn}:*`],
              }),
            ],
          }),
          'cognito-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'cognito-identity:*',
                  'cognito-idp:*',
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
      }),
    });

    const graphqlFunctionName = `${environment}-authorizer-example-api-gateway-graphql`;
    const graphqlFunctionLogs = new LogGroup(this, 'AuthorizerExampleLambdaGraphQLFunctionLogGroup', {
      logGroupName: `/aws/lambda/${graphqlFunctionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
    });

    const graphqlFunction = new NodejsFunction(this, 'AuthorizerExampleLambdaGraphQLFunction', {
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/graphql/index.ts',
      functionName: graphqlFunctionName,
      retryAttempts: 0,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        sourceMapMode: SourceMapMode.BOTH,
        sourcesContent: true,
        keepNames: true,
        commandHooks: {
          beforeInstall(): string[] {
            return [''];
          },
          beforeBundling(): string[] {
            return [''];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              // スキーマ定義を追加
              `cp ${inputDir}/../schema.gql ${outputDir}`,
            ];
          },
        },
      },
      role: new Role(this, 'AuthorizerExampleLambdaGraphQLFunctionExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [`${graphqlFunctionLogs.logGroupArn}:*`],
              }),
            ],
          }),
          'cognito-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'cognito-identity:*',
                  'cognito-idp:*',
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
      }),
    });

    const api = new RestApi(this, 'RestApi', {
      restApiName: `AuthorizerExample Server Lambda Rest API (${environment})`,
      deployOptions: {
        stageName: 'default',
      },
      endpointConfiguration: {
        types: [
          EndpointType.REGIONAL,
        ],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowCredentials: true,
        disableCache: true,
        statusCode: 204,
      },
    });
    api.deploymentStage.urlForPath('/');

    const authorizer = new CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      authorizerName: 'Authorizer',
      cognitoUserPools: [userPool],
    });

    api.root.addResource('rest').addMethod(
      'ANY',
      new LambdaIntegration(
        restFunction,
      ),
      {
        authorizer,
      },
    );

    api.root.addResource('graphql').addMethod(
      'ANY',
      new LambdaIntegration(
        graphqlFunction,
      ),
      {
        authorizer,
      },
    );

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'UnauthorizedGatewayResponse', {
      restApi: api,
      type: ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
    });

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'ClientErrorGatewayResponse', {
      restApi: api,
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
    });

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'ServerErrorGatewayResponse', {
      restApi: api,
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
    });

    new WebSocketApi(this, 'WebSocketApi', {
      apiName: `AuthorizerExample Server Lambda WebSocket API (${environment})`,
    }).addRoute('$connect', {
      integration: new WebSocketLambdaIntegration(
        'scheme-handler',
        graphqlFunction,
      ),
    });
  }
}
