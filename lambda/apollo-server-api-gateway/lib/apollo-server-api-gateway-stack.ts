import { HttpApi, HttpMethod, WebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import {
  Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApolloServerApiGatewayStackProps extends cdk.StackProps {
  environment: string,
}

export class ApolloServerApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApolloServerApiGatewayStackProps) {
    super(scope, id, props);

    const { environment } = props;

    const functionName = `${environment}-apollo-api-gateway`;
    const logs = new LogGroup(this, 'ApolloLambdaFunctionLogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
    });

    const apolloFn = new NodejsFunction(this, 'ApolloLambdaFunction', {
      runtime: Runtime.NODEJS_16_X,
      entry: './lambda/index.ts',
      functionName,
      retryAttempts: 0,
      bundling: {
        minify: true,
        sourceMap: true,
        sourceMapMode: SourceMapMode.BOTH,
        sourcesContent: true,
        keepNames: true,
        commandHooks: {
          beforeInstall(): string[] {
            return [''];
          },
          beforeBundling(): string[] {
            return [''];
          },
          afterBundling(inputDir: string, outputDir: string): string[] {
            return [
              // スキーマ定義を追加
              `cp ${inputDir}/core/schema.gql ${outputDir}`,
            ];
          },
        },
      },
      role: new Role(this, 'ApolloLambdaFunctionExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [`${logs.logGroupArn}:*`],
              }),
            ],
          }),
        },
      }),
    });
    new HttpApi(this, 'HttpApi', {
      apiName: `Apollo Server Lambda Http API (${environment})`,
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        apolloFn,
      ),
    }).addRoutes({
      path: '/',
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'api-handler',
        apolloFn,
      ),
    });

    new WebSocketApi(this, 'WebSocketApi', {
      apiName: `Apollo Server Lambda WebSocket API (${environment})`,
    }).addRoute('$connect', {
      integration: new WebSocketLambdaIntegration(
        'scheme-handler',
        apolloFn,
      ),
    });
  }
}
