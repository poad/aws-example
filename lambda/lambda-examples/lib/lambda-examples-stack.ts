import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { DockerImageFunction, DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import {
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import {
  Stack, StackProps,
} from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import path = require('path');
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment';
import { Repository } from 'aws-cdk-lib/aws-ecr';

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

    const lambdaFn = new PythonFunction(this, 'Ec2InstanceKiller', {
      functionName: 'ec2-instance-killer',
      entry: path.resolve(__dirname, '../lambda/python'),
      runtime: lambda.Runtime.PYTHON_3_12,
      logRetention: RetentionDays.ONE_DAY,
      role,
      timeout: cdk.Duration.seconds(14.5 * 60),
    });

    const schedule = new events.Rule(this, 'ec2-instance-killer', {
      schedule: events.Schedule.expression('cron(0 0 * * ? *)'),
    });

    const event = props.targetTags !== undefined ? ({
      event: events.RuleTargetInput.fromObject({ tags: props.targetTags }),
    }) : ({});

    schedule.addTarget(new targets.LambdaFunction(lambdaFn, event));

    const simpleEcrRepository = new Repository(this, 'simple-ecr-repository', {
      repositoryName: 'simple-lambda',
    });
    const simpleImage = new DockerImageAsset(this, 'docker-lambda-image', {
      directory: path.join(__dirname, 'lambda/container/simple'),
    });
    // eslint-disable-next-line no-new
    new ecrdeploy.ECRDeployment(this, 'DeployDockerImage', {
      src: new ecrdeploy.DockerImageName(simpleImage.imageUri),
      dest: new ecrdeploy.DockerImageName(`${simpleEcrRepository.repositoryUri}:latest`),
    });
    const simpleFn = new DockerImageFunction(this, 'docker-lambda-function', {
      code: DockerImageCode.fromEcr(simpleEcrRepository),
      functionName: `${props.environment}-docker-lambda`,
      logRetention: RetentionDays.ONE_DAY,
      retryAttempts: 0,
    });

    const simpleFnApi = new HttpApi(this, 'HttpApi', {
      apiName: 'Docker Lambda API',
      defaultIntegration: new HttpLambdaIntegration('default-handler', simpleFn),
    });
    simpleFnApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration: new HttpLambdaIntegration('proxy-handler', simpleFn),
    });

    const rustFn = new DockerImageFunction(this, 'hello-rust-lambda-function', {
      code: DockerImageCode.fromImageAsset('lambda', {
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
