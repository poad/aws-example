import { DockerImageFunction, DockerImageCode } from '@aws-cdk/aws-lambda';

import {
  Effect, FederatedPrincipal, ManagedPolicy, PolicyStatement, Role, WebIdentityPrincipal,
} from '@aws-cdk/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, UserPool, CfnIdentityPool,
} from '@aws-cdk/aws-cognito';
import { Stack, StackProps, Construct } from '@aws-cdk/core';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations';
import { RetentionDays } from '@aws-cdk/aws-logs';
import { Bucket } from '@aws-cdk/aws-s3';

export interface GroupConfig {
  id: string,
  name: string,
  admin: boolean,
}

export interface CognitoLambdaStackProps extends StackProps {
  name: string,
  region: string,
  environment: string,
  groups: GroupConfig[],
  domain: string,
  clientId: string,
  idPoolId: string,
  identityProvider: string,
  s3Region: string,
  s3Bucket: string,
}

export class CognitoLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoLambdaStackProps) {
    super(scope, id, props);

    const fn = new DockerImageFunction(this, 'CognitoLambdaFunction', {
      code: DockerImageCode.fromImageAsset('lambda'),
      functionName: props.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DOMAIN': props.domain,
        'CLIENT_ID': props.clientId,
        'ID_POOL_ID': props.idPoolId,
        'IDENTITY_PROVIDER': props.identityProvider,
        'S3_REGION': props.s3Region,
        'S3_BUCKET': props.s3Bucket,
      },
    });

    const userPool = new UserPool(this, 'CognitoAwsConsoleUserPool', {
      userPoolName: `${props.environment}-cognito-lambda-user-pool`,
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

    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: `${props.environment}-poad-s3-lambda`
      }
    });

    const api = new HttpApi(this, "HttpApi", {
      apiName: 'Cognito Lambda API',
      defaultIntegration: new LambdaProxyIntegration({
        handler: fn
      })
    });
    api.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.ANY],
      integration: new LambdaProxyIntegration({
        handler: fn
      }),
    });

    const client = new UserPoolClient(this, 'CognitoAwsConsoleAppClient', {
      userPool,
      userPoolClientName: `${props.environment}-cognito-lambda`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true,
        custom: true,
      },
      oAuth: {
        callbackUrls: [ `${api.url}index.html` ],
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
    };
    const identityPool = new CfnIdentityPool(this, 'CognitoAwsConsoleIdPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        identityPoolProvider,
      ],
      identityPoolName: `${props.environment}-cognito-lambda-idp`,
    });

    const unauthenticatedRole = new Role(this, 'CognitoDefaultUnauthenticatedRole', {
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
      ],
      resources: ['*'],
    }));

    const authenticatedRole = new Role(this, 'CognitoDefaultAuthenticatedRole', {
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com', {
        StringEquals: {
          'cognito-identity.amazonaws.com:aud': identityPool.ref,
        },
        'ForAnyValue:StringLike': {
          'cognito-identity.amazonaws.com:amr': 'authenticated',
        },
      }, 'sts:AssumeRoleWithWebIdentity'),
    });

    authenticatedRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cognito-sync:*',
        'cognito-identity:*',
      ],
      resources: ['*'],
    }));
    authenticatedRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'sts:GetFederationToken',
      ],
      resources: ['*'],
    }));

    authenticatedRole.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        's3:GetBucket*',
        's3:ListBucket*',
      ],
      resources: ['*'],
    }));

    if (props.region === props.s3Region) {
      const s3 = new Bucket(this, 'S3Bucket', {
        bucketName: props.s3Bucket
      });
      authenticatedRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          's3:GetObject*',
          's3:ListObject*',
        ],
        resources: [
          `${s3.bucketArn}/`,
          `${s3.bucketArn}/*`
        ],
      }));

    }

    new CfnIdentityPoolRoleAttachment(this, 'CognitoAwsConsoleIdPoolRoleAttachment', {
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
        'cognito-identity.amazonaws.com:aud': userPool.userPoolId,
      },
      'ForAnyValue:StringLike': {
        'cognito-identity.amazonaws.com:amr': 'authenticated',
      },
    };

    const roles = props.groups.map((group) => {
      const groupRole = new Role(this, `${props.environment}-CognitoAwsConsolGroupRole-${group.name}`, {
        assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', conditions),
      });
      if (group.admin) {
        groupRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AdminAccessPolicy', 'arn:aws:iam::aws:policy/AdministratorAccess'));
      }
      groupRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
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
