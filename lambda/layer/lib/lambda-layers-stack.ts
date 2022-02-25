import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class LambdaLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const layer = new lambda.LayerVersion(this, "layer", {
      code: lambda.Code.fromAsset("lambda/layer", {
        exclude: [
          // 'package.json',
          // 'log.ts',
          // 'yarn.lock'
        ]
      }),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
    });

    new lambda.Function(this, "LambdaFunction", {
      functionName: 'lamda-layer-example',
      code: lambda.Code.fromAsset("lambda/function", {
        exclude: [
          // 'package.json',
          // 'index.ts',
          // 'yarn.lock',
        ]
      }),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      layers: [layer],
    });
  }
}
