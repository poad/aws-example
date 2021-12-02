import { DockerImageFunction, DockerImageCode } from 'aws-cdk-lib/aws-lambda';

import { Stack, StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { LambdaProxyIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';


export interface DockerLambdaStackStackProps extends StackProps {
  name: string,
  region: string,
  environment: string,
}

export class DockerLambdaStack extends Stack {
  constructor(scope: Construct, id: string, props: DockerLambdaStackStackProps) {
    super(scope, id, props);

    const fn = new DockerImageFunction(this, 'docker-lambda-function', {
      code: DockerImageCode.fromImageAsset('lambda', {
      }),
      functionName: props.name,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
    });

    const api = new HttpApi(this, "HttpApi", {
      apiName: 'Docker Lambda API',
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
