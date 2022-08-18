import { HttpApi, HttpMethod, WebSocketApi } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration, WebSocketLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import * as cdk from 'aws-cdk-lib';
import { Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApolloServerApiGatewayStackProps extends cdk.StackProps {
  environment: string,
}

export class ApolloServerApiGatewayStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApolloServerApiGatewayStackProps) {
    super(scope, id, props);

    const { environment } = props;

    const apolloFn = new NodejsFunction(this, 'ApolloLambdaFunction', {
      runtime: Runtime.NODEJS_16_X,
      entry: 'lambda/index.ts',
      functionName: `${environment}-apollo-api-gateway`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
      role: new Role(this, 'ApolloLambdaFunctionExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents'
                ],
                resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/${environment}-apollo-api-gateway:*`],
              })
            ]
          }),
          'assumed-role-policy': new PolicyDocument(
            {
              statements: [
                new PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                    'cognito-identity:*',
                    "cognito-idp:*",
                    'sts:GetFederationToken',
                    'sts:AssumeRoleWithWebIdentity',
                  ],
                  resources: ['*'],
                })
              ]
            }
          )
        },
      })
    });
    new HttpApi(this, "HttpApi", {
      apiName: `Apollo Server Lambda Http API (${environment})`,
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        apolloFn
      )
    }).addRoutes({
      path: "/",
      methods: [HttpMethod.GET, HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        'api-handler',
        apolloFn
      ),
    });

    new WebSocketApi(this, "WebSocketApi", {
      apiName: `Apollo Server Lambda WebSocket API (${environment})`,
    }).addRoute('$connect', {
      integration: new WebSocketLambdaIntegration(
        'scheme-handler',
        apolloFn
      ),
    });
  }
}
