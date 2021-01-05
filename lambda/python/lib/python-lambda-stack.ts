import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as targets from '@aws-cdk/aws-events-targets';
import * as lambda from '@aws-cdk/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python';
import path = require('path');

export interface ContextAppStackProps extends cdk.StackProps {
  tag: string;
}
export class PythonLambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ContextAppStackProps) {
    super(scope, id, props);

    const lambdaFn = new PythonFunction(this, 'Ec2InstanceKiller', {
      functionName: 'ec2-instance-killer',
      entry: path.resolve(__dirname, '../functions'),
      runtime: lambda.Runtime.PYTHON_3_8
    });

    const schedule = new events.Rule(this, 'ec2-instance-killer', {
      schedule: events.Schedule.expression('cron(0 0 * * ? *)')
    });

    schedule.addTarget(new targets.LambdaFunction(lambdaFn));
  }
}
