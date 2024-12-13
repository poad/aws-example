import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as docker from 'aws-cdk-lib/aws-lambda';
import {
  Stack, StackProps,
} from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface GroupConfig {
  id: string,
  name: string,
  admin: boolean,
}

export interface LambdaExamplesStackProps extends StackProps {
  name: string,
  region: string,
  environment: string,
  groups: GroupConfig[],
  domain: string,
  auth0Domain?: string,
  providers?: string,
  Lambda: {
    app: {
      signIn: {
        name: string,
        entry: string,
      },
      signOut: {
        name: string,
        entry: string,
      },
      userInfo: {
        name: string,
        entry: string,
      },
    },
    triggers: {
      preSignUp?: {
        name: string,
        entry: string,
      },
      preAuth?: {
        name: string,
        entry: string,
      },
      postAuth?: {
        name: string,
        entry: string,
      },
      defAuthChallenge?: {
        name: string,
        entry: string,
      },
      createAuthChallenge?: {
        name: string,
        entry: string,
      },
      verifyAuthChallenge?: {
        name: string,
        entry: string,
      },
      postConfirm?: {
        name: string,
        entry: string,
      },
      preGenToken?: {
        name: string,
        entry: string,
      },
      customMessge?: {
        name: string,
        entry: string,
      },
      userMigrate?: {
        name: string,
        entry: string,
      },
    }
  },
  targetTags: Array<string>,
}

export class LambdaExamplesStack extends Stack {
  constructor(scope: Construct, id: string, props: LambdaExamplesStackProps) {
    super(scope, id, props);

    const role = new iam.Role(this, 'ec2-instance-killer-role', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
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
            }),
          ],
        }),
        'logs-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    const schedule = new events.Rule(this, 'ec2-instance-killer', {
      schedule: events.Schedule.expression('cron(0 0 * * ? *)'),
    });

    const event = !props.targetTags ? ({
      event: events.RuleTargetInput.fromObject({ tags: props.targetTags }),
    }) : ({});

    const rustFn = new docker.DockerImageFunction(this, 'hello-rust-lambda-function', {
      code: docker.DockerImageCode.fromImageAsset('lambda', {
        target: 'release',
      }),
      functionName: `${props.environment}-hello-rust-lambda`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
    });

    const rustFnApi = new HttpApi(this, 'HttpApi', {
      apiName: 'Hello Rust Lambda API',
      defaultIntegration: new HttpLambdaIntegration(
        'default-handler',
        rustFn,
      ),
    });
    rustFnApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration(
        'proxy-handler',
        rustFn,
      ),
    });
  }
}
