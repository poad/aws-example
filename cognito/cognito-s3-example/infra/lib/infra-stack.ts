import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as cognito from '@aws-cdk/aws-cognito';

export interface GroupConfig {
  id: string,
  name: string,
  baseDir?: string,
  dirs: string[]
}

interface InfraProps extends cdk.StackProps {
  userPoolId: string,
  idPoolId: string,
  bucket: string,
  groups: GroupConfig[]
}

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: InfraProps) {
    super(scope, id, props);

    const conditions = {
      "StringEquals": {
        "cognito-identity.amazonaws.com:aud": props.idPoolId
      },
      "ForAnyValue:StringLike": {
        "cognito-identity.amazonaws.com:amr": "authenticated"
      }
    };
    const roles = props.groups.map(group => {
      const serviceRole = new iam.Role(this, `cognito-s3-example-authRole-${group.name}`, {
        assumedBy: new iam.WebIdentityPrincipal('cognito-identity.amazonaws.com', conditions)
      });
      const baseDir = group.baseDir ? `${group.baseDir}/` : "";
      group.dirs.forEach(dir => {
        const allowPath = `${baseDir}${dir}`
        serviceRole.addToPolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: [
              `arn:aws:s3:::${props.bucket}`,
              `arn:aws:s3:::${props.bucket}/_next/*`,
              `arn:aws:s3:::${props.bucket}/index.html`,
              `arn:aws:s3:::${props.bucket}/404.html`,
              `arn:aws:s3:::${props.bucket}/favicon.ico`,
              `arn:aws:s3:::${props.bucket}/vercel.svg`,
              `arn:aws:s3:::${props.bucket}/${allowPath}/*`
            ],
            actions: [            
              's3:*'
            ]
          })
        );
        serviceRole.addToPolicy(
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            actions: [            
              's3:GetAccessPoint',
              's3:GetAccountPublicAccessBlock',
              's3:ListAllMyBuckets',
              's3:ListAccessPoints',
              's3:ListJobs',
              's3:ListBucket'
            ]
          })
        );
      });
      return { id: group.id, name: group.name, role: serviceRole };
    });
    roles.forEach(role => {
      new cognito.CfnUserPoolGroup(this, role.id, {
        groupName: role.name,
        userPoolId: props.userPoolId,
        roleArn: role.role.roleArn
      })
    });
    
  }
}
