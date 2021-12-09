import { DockerImageFunction, DockerImageCode } from 'aws-cdk-lib/aws-lambda';

import {
  Effect, FederatedPrincipal, ManagedPolicy, PolicyStatement, Role, WebIdentityPrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  AccountRecovery, Mfa, OAuthScope, UserPoolClient, CfnIdentityPoolRoleAttachment, CfnUserPoolGroup, UserPool, CfnIdentityPool,
} from 'aws-cdk-lib/aws-cognito';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

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
  s3Region: string,
  s3Bucket: string,
}

export class CognitoLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: CognitoLambdaStackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'UserPool', {
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

    const domain = `${props.environment}-poad-s3-lambda`;
    userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: domain
      }
    });

    const fn = new DockerImageFunction(this, 'CognitoLambdaFunction', {
      code: DockerImageCode.fromImageAsset('lambda', {}),
      functionName: props.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      environment: {
        'DOMAIN': domain,
        'S3_REGION': props.s3Region,
        'S3_BUCKET': props.s3Bucket,
        'REGION': props.region,
      },
    });



    const api = new HttpApi(this, "HttpApi", {
      apiName: 'Cognito Lambda API',
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        fn
      )
    });
    api.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'proxy-handler',
        fn
      ),
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
      identityPoolName: `${props.environment}-cognito-lambda-idp`,
    });

    fn.addEnvironment('CLIENT_ID', client.userPoolClientId);
    fn.addEnvironment('ID_POOL_ID', identityPool.ref);
    fn.addEnvironment('IDENTITY_PROVIDER', identityPoolProvider.providerName);

    const unauthenticatedRole = new Role(this, 'CognitoDefaultUnauthenticatedRole', {
      roleName: `${props.environment}-cognito-unauth-role`,
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
      ],
      resources: ['*'],
    }));

    const authenticatedRole = new Role(this, 'CognitoDefaultAuthenticatedRole', {
      roleName: `${props.environment}-cognito-auth-role`,
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
        bucketName: `${props.s3Bucket}-${this.account}`,
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
        roleName: `${props.environment}-group-role-${group.name}`,
        assumedBy: new WebIdentityPrincipal('cognito-identity.amazonaws.com', conditions),
        maxSessionDuration: Duration.hours(12),
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
      groupRole.addToPolicy(new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cognito-sync:*',
          'cognito-identity:*',
          "cognito-idp:*",
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
