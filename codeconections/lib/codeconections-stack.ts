import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codeconnections from 'aws-cdk-lib/aws-codeconnections';
import { Construct } from 'constructs';

export class CodeconectionsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const connections = new codeconnections.CfnConnection(this, 'CodeConnections', {
      connectionName: 'github-connection',
      providerType: 'GitHub',
    });

    new codebuild.CfnSourceCredential(this, 'CodeBuildSourceCredential', {
      authType: 'CODECONNECTIONS',
      serverType: 'GITHUB',
      token: connections.attrConnectionArn,
    });
  }
}
