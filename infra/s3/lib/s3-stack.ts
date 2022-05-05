import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ParameterDataType, ParameterType, StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export class S3Stack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const bucket = new Bucket(this, 'ArtifactStore', {
      bucketName: `codepipeline-artifact-store-${this.region}-${this.account}`,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    bucket.addToResourcePolicy(new PolicyStatement({
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:ListBucket',
        's3:DeleteObject',
        's3:GetBucketLocation',
      ],
      resources: [
        `arn:aws:s3:::codepipeline-artifact-store-${this.region}-${this.account}`,
        `arn:aws:s3:::codepipeline-artifact-store-${this.region}-${this.account}/*`
      ],
      principals: [
        new ServicePrincipal('codepipeline.amazonaws.com'),
      ],
      effect: Effect.ALLOW
    }));

    new StringParameter(this, 'BucketArn', {
      parameterName: '/infta/codepipeline/ArtifactStore',
      type: ParameterType.STRING,
      stringValue: bucket.bucketName,
    });
  }
}
