import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect,
} from 'aws-cdk-lib/aws-iam';
import { FunctionUrl, FunctionUrlAuthType, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path from 'path';

// eslint-disable-next-line import/prefer-default-export
export class ApolloServerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const functionName = 'apollo-server-lambda';

    const logGroupName = `/aws/lambda/${functionName}`;
    const logGroup = new LogGroup(this, 'ApolloServerLambdaFnLogGroup', {
      logGroupName,
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fn = new NodejsFunction(this, 'ApolloServerLambdaFn', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.resolve(__dirname, '../lambda/index.ts'),
      functionName,
      retryAttempts: 0,
      role: new Role(this, 'ApolloServerExecutionRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
        inlinePolicies: {
          'logs-policy': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'logs:CreateLogGroup',
                  'logs:CreateLogStream',
                  'logs:PutLogEvents',
                ],
                resources: [`${logGroup.logGroupArn}:*`],
              }),
            ],
          }),
        },
      }),
    });

    // eslint-disable-next-line no-new
    new FunctionUrl(this, 'ApolloServerLambdaFnUrl', {
      function: fn,
      authType: FunctionUrlAuthType.NONE,
    });
  }
}
