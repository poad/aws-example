import { WebSocketApi } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import {
  Cors, EndpointType, GatewayResponse, LambdaIntegration, ResponseType, RestApi,
} from 'aws-cdk-lib/aws-apigateway';
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
      runtime: Runtime.NODEJS_18_X,
      entry: './lambda/index.ts',
      functionName,
      retryAttempts: 0,
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        sourceMapMode: SourceMapMode.BOTH,
        sourcesContent: true,
        keepNames: true,
        target: 'node18',
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
              `cp ${inputDir}/../schema.graphqls ${outputDir}`,
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

    const api = new RestApi(this, 'RestApi', {
      restApiName: `Apollo Server Lambda API (${environment})`,
      deployOptions: {
        stageName: 'default',
      },
      endpointConfiguration: {
        types: [
          EndpointType.REGIONAL,
        ],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowCredentials: true,
        disableCache: true,
        statusCode: 204,
      },
    });
    api.deploymentStage.urlForPath('/');

    api.root.addMethod(
      'ANY',
      new LambdaIntegration(
        apolloFn,
      ),
    );

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'UnauthorizedGatewayResponse', {
      restApi: api,
      type: ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
    });

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'ClientErrorGatewayResponse', {
      restApi: api,
      type: ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
    });

    // eslint-disable-next-line no-new
    new GatewayResponse(this, 'ServerErrorGatewayResponse', {
      restApi: api,
      type: ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': '\'*\'',
      },
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
