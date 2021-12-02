import * as cdk from 'aws-cdk-lib';
import { DockerImageFunction, DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface HelloRustLambdaStackProps extends cdk.StackProps {
  name: string,
  region: string,
  environment: string,
}

export class HelloRustLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: HelloRustLambdaStackProps) {
    super(scope, id, props);

    const fn = new DockerImageFunction(this, 'hello-rust-lambda-function', {
      code: DockerImageCode.fromImageAsset('lambda', {
        target: 'release'
      }),
      functionName: props.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
    });

    const api = new HttpApi(this, "HttpApi", {
      apiName: 'Hello Rust Lambda API',
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
  }
}
