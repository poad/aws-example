import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import path = require('path');
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ContextAppStackProps extends cdk.StackProps {
  targetTags: Array<string>;
}
export class PythonLambdaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ContextAppStackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'ec2-instance-killer-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        'ec2-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'ec2:DescribeInstances',
                'ec2:StopInstances',
                'ec2:TerminateInstances',
              ],
              resources: ['*'],
            })
          ]
        }),
        'logs-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
              ],
              resources: ['*'],
            })
          ]
        }),
      },
    });

    const lambdaFn = new PythonFunction(this, 'Ec2InstanceKiller', {
      functionName: 'ec2-instance-killer',
      entry: path.resolve(__dirname, '../functions'),
      runtime: lambda.Runtime.PYTHON_3_9,
      logRetention: RetentionDays.ONE_DAY,
      role: role,
      timeout: cdk.Duration.seconds(14.5 * 60),
    });

    const schedule = new events.Rule(this, 'ec2-instance-killer', {
      schedule: events.Schedule.expression('cron(0 0 * * ? *)')
    });

    const event = props.tags !== undefined ? ({
      event: RuleTargetInput.fromObject({ tags: props.tags })
    }) : ({});

    schedule.addTarget(new targets.LambdaFunction(lambdaFn, event));
  }
}
