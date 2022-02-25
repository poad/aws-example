import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class LambdaLayersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const testLayer = new lambda.LayerVersion(this, "layer", {
      code: lambda.Code.fromAsset("lambda/layer"),
      compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
    });
    
    const testFunction = new lambda.Function(this, "function", {
      code: lambda.Code.fromAsset("lambda/function"),
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "index.handler",
      layers: [testLayer],
    });  
  }
}
