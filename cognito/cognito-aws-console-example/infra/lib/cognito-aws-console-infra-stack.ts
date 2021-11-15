import * as cdk from '@aws-cdk/core';
import * as cognito from '@aws-cdk/aws-cognito';
import * as iam from '@aws-cdk/aws-iam';
import { AccountRecovery, Mfa, OAuthScope, UserPoolClientIdentityProvider, UserPoolIdentityProvider } from '@aws-cdk/aws-cognito';
import { Duration, Stack } from '@aws-cdk/core';
import { ManagedPolicy } from '@aws-cdk/aws-iam';


export interface GroupConfig {
  id: string,
  name: string,
  admin: boolean
}

interface CognitoAwsConsoleInfraProps extends cdk.StackProps {
  environment: string,
  groups: GroupConfig[]
}

export class CognitoAwsConsoleInfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: CognitoAwsConsoleInfraProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, `CognitoAwsConsoleUserPool`, {
      userPoolName: `${props.environment}-cognito-aws-console-user-pool`,
      signInAliases: {
        username: true,
        email: true,
        preferredUsername: true,
        phone: false
      },
      autoVerify: {
        email: true
      },
      standardAttributes: {
        email: {
          required: true
        },
        preferredUsername: {
          required: true
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

    const client = new cognito.UserPoolClient(this, 'CognitoAwsConsoleAppClient', {
      userPool: userPool,
      userPoolClientName: `${props.environment}-cognito-aws-console`,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
        userPassword: true
      },
      oAuth: {
        callbackUrls: undefined,
        logoutUrls: undefined,
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
      }
    });

    const identityPoolProvider = {
      clientId: client.userPoolClientId,
      providerName: userPool.userPoolProviderName,
    };
    const identityPool = new cognito.CfnIdentityPool(this, 'CognitoAwsConsoleIdPool', {
      allowUnauthenticatedIdentities: false,
      allowClassicFlow: true,
      cognitoIdentityProviders: [
        identityPoolProvider
      ],
      identityPoolName: `${props.environment} cognito aws console idp`
    });
    
    // TODO https://github.com/aws/aws-cdk/issues/2041 sts:TagSession support

    const unauthenticatedRole = new iam.Role(this, 'CognitoDefaultUnauthenticatedRole', {
      roleName: `${props.environment}-console-unauth-role`,
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
      roleName: `${props.environment}-console-auth-role`,
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

    new cognito.CfnIdentityPoolRoleAttachment(this, 'CognitoAwsConsoleIdPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        "authenticated": authenticatedRole.roleArn,
        "unauthenticated": unauthenticatedRole.roleArn
      },
      // roleMappings: {
      //   'cognito-aws-console': {
      //     ambiguousRoleResolution: 'AuthenticatedRole',
      //     identityProvider: `cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}:${client.userPoolClientId}`,
      //     type: 'Token'
      //   }
      // }
    });

    const conditions = {
      "StringEquals": {
        "cognito-identity.amazonaws.com:aud": identityPool.ref
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated"
      },
    };

    const roles = props.groups.map(group => {
      const groupRole = new iam.Role(this, `${props.environment}-console-group-role-${group.name}`, {
        assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', conditions),
        roleName: `${props.environment}-console-group-role-${group.name}`,
        maxSessionDuration: Duration.hours(12),
      });
      if (group.admin) {
        groupRole.addManagedPolicy(ManagedPolicy.fromManagedPolicyArn(this, 'AdminAccessPolicy', 'arn:aws:iam::aws:policy/AdministratorAccess'))
      }
      groupRole.addToPolicy(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "sts:*"
        ],
        resources: ["*"],
      }));
  
      return { id: group.id, name: group.name, role: groupRole };
    });
    roles.forEach(role => {
      new cognito.CfnUserPoolGroup(this, role.id, {
        groupName: `${props.environment}-${role.name}`,
        userPoolId: userPool.userPoolId,
        roleArn: role.role.roleArn
      })
    });
    
  }
}
