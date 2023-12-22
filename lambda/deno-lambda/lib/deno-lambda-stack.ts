import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sam from 'aws-cdk-lib/aws-sam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class DenoLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  
    const denoRuntime = new sam.CfnApplication(this, "DenoRuntime", {
      location: {
        applicationId:
          "arn:aws:serverlessrepo:us-east-1:390065572566:applications/deno",
        semanticVersion: "1.32.5",
      },
    });

    // Deno Layer
    const layer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "denoRuntimeLayer",
      denoRuntime.getAtt("Outputs.LayerArn").toString(),
    );

    const name = new lambda.Function(this, "HelloHandler", {
      runtime: lambda.Runtime.PROVIDED_AL2023,
      code: lambda.Code.fromAsset("lambda"),
      handler: "index.handler",
      layers: [layer],
    });

    // API Gateway
    new apigateway.LambdaRestApi(this, "Endpoint", {
      handler: name,
    });
  }
}
