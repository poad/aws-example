import * as cdk from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import {
  Role, ServicePrincipal, PolicyDocument, PolicyStatement, Effect,
} from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path = require('path');

// eslint-disable-next-line import/prefer-default-export
export class EventbridgeLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const functionName = 'evendbridge-lambda';

    const logGroupName = `/aws/lambda/${functionName}`;
    const logGroup = new LogGroup(this, 'EventBridgeLambdaFnLogGroup', {
      logGroupName,
      retention: RetentionDays.ONE_DAY,
    });

    const fn = new NodejsFunction(this, 'EventBridgeLambdaFn', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.resolve(__dirname, '../lambda/index.ts'),
      functionName,
      retryAttempts: 0,
      role: new Role(this, 'EventBridgeExecutionRole', {
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
                resources: [`${logGroup.logGroupArn}:*`],
              }),
            ],
          }),
        },
      }),
    });

    // eslint-disable-next-line no-new
    new Rule(this, 'ScheduleEventRule', {
      schedule: Schedule.cron({
        minute: '*/5',
      }),
      targets: [new LambdaFunction(fn, {})],
    });
  }
}
