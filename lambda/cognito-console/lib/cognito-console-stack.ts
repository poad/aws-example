import { DockerImageFunction, DockerImageCode } from '@aws-cdk/aws-lambda';

import {
  Effect, FederatedPrincipal, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal, WebIdentityPrincipal,
} from '@aws-cdk/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, UserPool, CfnIdentityPool,
} from '@aws-cdk/aws-cognito';
import { Stack, StackProps, Construct, Duration } from '@aws-cdk/core';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { RetentionDays } from '@aws-cdk/aws-logs';

export interface GroupConfig {
  id: string,
  name: string,
  admin: boolean,
}

export interface CCognitoConsoleStackProps extends StackProps {
  name: string,
  region: string,
  environment: string,
  groups: GroupConfig[],
  domain: string,
}

export class CognitoConsoleStack extends Stack {
  constructor(scope: Construct, id: string, props: CCognitoConsoleStackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `${props.environment}-cognito-console-lambda`,
      signInAliases: {
        username: true,
        email: true,
        preferredUsername: true,
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
          required: true,
        },
        phoneNumber: {
          required: false,
        },
      },
      mfa: Mfa.OPTIONAL,
      passwordPolicy: {
        minLength: 12,
      },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
    });

    const domain = props.domain;
    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: domain
      }
    });

    const signInFn = new DockerImageFunction(this, 'CognitoLambdaFunction', {
      code: DockerImageCode.fromImageAsset('signin-lambda', {
        repositoryName: 'signin-lambda',
      }),
      functionName: props.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DOMAIN': domain,
        'REGION': props.region,
      },
      role: new Role(this, 'LambdaExecutionRole', {
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
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${props.name}:*`],
              })
            ]
          }),
        },
      })
    });

    const api = new HttpApi(this, "HttpApi", {
      apiName: 'Cognito Lambda API',
      defaultIntegration: new LambdaProxyIntegration({
        handler: signInFn
      })
    });
    api.addRoutes({
      path: "/signin",
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
        callbackUrls: [`${api.url}index.html`],
        logoutUrls: undefined,
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
    });

    unauthenticatedRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-sync:*',
        'cognito-identity:*',
        "cognito-idp:*",
        'sts:GetFederationToken',
      ],
      resources: ['*'],
    }));

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
    });

    authenticatedRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-sync:*',
        'cognito-identity:*',
        "cognito-idp:*",
        'sts:GetFederationToken',
      ],
      resources: ['*'],
    }));

    new CfnIdentityPoolRoleAttachment(this, 'IdPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
        unauthenticated: unauthenticatedRole.roleArn,
      },
      roleMappings: {
        'cognito-lambda': {
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}:${client.userPoolClientId}`,
          type: 'Token',
        },
      },
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
          'cognito-sync:*',
          'cognito-identity:*',
          "cognito-idp:*",
          'sts:GetFederationToken',
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
