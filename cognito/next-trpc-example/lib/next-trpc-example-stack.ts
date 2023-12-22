import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cfOrigins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as crypto from 'crypto';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { nextJsExport } from './process/deploy';

export interface NextTRpcExampleStackProps extends cdk.StackProps {
  environment: string;
  bucketName: string;
  cloudfront: {
    comment: string;
  };
}

export class NextTRpcExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NextTRpcExampleStackProps) {
    super(scope, id, props);

    const {
      environment,
      bucketName,
      cloudfront: { comment },
    } = props;

    const store = new s3.Bucket(this, 'BatchDataStore', {
      bucketName: `${bucketName}-batch-data`,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      accessControl: s3.BucketAccessControl.PRIVATE,
      publicReadAccess: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const batchFunctionName = `${environment}-trpc-example-batch-function`;
    const batchFunctionLogs = new logs.LogGroup(
      this,
      'tRPCExampleBatchFunctionLogGroup',
      {
        logGroupName: `/aws/lambda/${batchFunctionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
      },
    );

    const batchFunction = new nodejs.NodejsFunction(
      this,
      'tRPCExampleLambdaBatchFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: './batch/index.ts',
        functionName: batchFunctionName,
        retryAttempts: 2,
        timeout: cdk.Duration.minutes(15),
        memorySize: 256,
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          STORE_BUCKET: store.bucketName,
          S3_OBJECT_KEY: 'pokemon.json',
        },
        bundling: {
          minify: true,
          sourceMap: true,
          sourceMapMode: nodejs.SourceMapMode.BOTH,
          sourcesContent: true,
          keepNames: true,
          target: 'node18',
        },
        role: new iam.Role(this, 'tRPCExampleBatchFunctionExecutionRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          inlinePolicies: {
            'logs-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                  resources: [`${batchFunctionLogs.logGroupArn}:*`],
                }),
              ],
            }),
            'cognito-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['cognito-identity:*', 'cognito-idp:*'],
                  resources: ['*'],
                }),
              ],
            }),
            's3-access-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['s3:*'],
                  resources: [store.bucketArn, `${store.bucketArn}/*`],
                }),
              ],
            }),
          },
        }),
      },
    );

    // eslint-disable-next-line no-new
    new events.Rule(this, 'BatchSchedule', {
      ruleName: 'trpc-example-batch-schedule',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '9',
        day: '*',
        month: '*',
        year: '*',
      }),
      targets: [new targets.LambdaFunction(batchFunction)],
    });

    const s3bucket = new s3.Bucket(this, 'S3Bucket', {
      bucketName,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      accessControl: s3.BucketAccessControl.PRIVATE,
      publicReadAccess: false,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    const hash = crypto
      .createHash('md5')
      .update(new Date().getTime().toString())
      .digest('hex');

    const deployRole = new iam.Role(this, 'DeployWebsiteRole', {
      roleName: `${environment}-trpc-example-deploy-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      inlinePolicies: {
        's3-policy': new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:*'],
              resources: [`${s3bucket.bucketArn}/`, `${s3bucket.bucketArn}/*`],
            }),
          ],
        }),
      },
    });

    s3bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:*'],
        principals: [new iam.StarPrincipal()],
        resources: [`${s3bucket.bucketArn}/*`],
        conditions: {
          StringNotLike: {
            'aws:Referer': hash,
          },
          StringNotEquals: {
            's3:ResourceAccount': this.account,
            'aws:PrincipalArn': new iam.ArnPrincipal(deployRole.roleArn).arn,
          },
        },
      }),
    );
    s3bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:GetObject'],
        principals: [new iam.StarPrincipal()],
        resources: [`${s3bucket.bucketArn}/*`],
        conditions: {
          StringLike: {
            'aws:Referer': hash,
          },
        },
      }),
    );
    s3bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:*'],
        principals: [new iam.AccountPrincipal(this.account)],
        resources: [`${s3bucket.bucketArn}/*`],
        conditions: {
          StringEquals: {
            's3:ResourceAccount': this.account,
          },
        },
      }),
    );

    const distribution = new cloudfront.Distribution(this, 'CloudFront', {
      comment,
      defaultBehavior: {
        origin: new cfOrigins.HttpOrigin(
          `${bucketName}.s3-website-${this.region}.amazonaws.com`,
          {
            customHeaders: {
              Referer: hash,
            },
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
          },
        ),
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      },
      enableIpv6: false,
      defaultRootObject: 'index.html',
    });

    const trpcFunctionName = `${environment}-trpc-example-api-gateway-trpc`;
    const trpcFunctionLogs = new logs.LogGroup(
      this,
      'tRPCExampleLambdaFunctionLogGroup',
      {
        logGroupName: `/aws/lambda/${trpcFunctionName}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        retention: logs.RetentionDays.ONE_DAY,
      },
    );

    const tRpcFunction = new nodejs.NodejsFunction(
      this,
      'tRPCExampleLambdaFunction',
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        entry: './lambda/index.ts',
        functionName: trpcFunctionName,
        retryAttempts: 0,
        timeout: cdk.Duration.seconds(29),
        environment: {
          NODE_OPTIONS: '--enable-source-maps',
          STORE_BUCKET: store.bucketName,
          S3_OBJECT_KEY: 'pokemon.json',
        },
        bundling: {
          minify: true,
          sourceMap: true,
          sourceMapMode: nodejs.SourceMapMode.BOTH,
          sourcesContent: true,
          keepNames: true,
          target: 'node18',
        },
        role: new iam.Role(this, 'tRPCExampleLambdaFunctionExecutionRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          inlinePolicies: {
            'logs-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
                  resources: [`${trpcFunctionLogs.logGroupArn}:*`],
                }),
              ],
            }),
            'cognito-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['cognito-identity:*', 'cognito-idp:*'],
                  resources: ['*'],
                }),
              ],
            }),
            's3-access-policy': new iam.PolicyDocument({
              statements: [
                new iam.PolicyStatement({
                  effect: iam.Effect.ALLOW,
                  actions: ['s3:*'],
                  resources: [store.bucketArn, `${store.bucketArn}/*`],
                }),
              ],
            }),
          },
        }),
      },
    );

    const api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `tRPC Example Server Lambda Rest API (${environment})`,
      deployOptions: {
        stageName: 'default',
      },
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: apigateway.Cors.DEFAULT_HEADERS,
        allowCredentials: true,
        disableCache: true,
        statusCode: 204,
      },
    });

    api.root.addResource('{proxy+}').addMethod(
      'ANY',
      new apigateway.LambdaIntegration(tRpcFunction, {
        timeout: cdk.Duration.seconds(29),
      }),
    );
    const apiUrl = api.deploymentStage.urlForPath();

    // eslint-disable-next-line no-new
    new apigateway.GatewayResponse(this, 'UnauthorizedGatewayResponse', {
      restApi: api,
      type: apigateway.ResponseType.UNAUTHORIZED,
      statusCode: '401',
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    // eslint-disable-next-line no-new
    new apigateway.GatewayResponse(this, 'ClientErrorGatewayResponse', {
      restApi: api,
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    // eslint-disable-next-line no-new
    new apigateway.GatewayResponse(this, 'ServerErrorGatewayResponse', {
      restApi: api,
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: {
        'Access-Control-Allow-Origin': "'*'",
      },
    });

    // eslint-disable-next-line no-new
    new cdk.CfnOutput(this, 'AppURL', {
      value: `https://${distribution.distributionDomainName}/`,
    });

    // eslint-disable-next-line no-new
    new cdk.CfnOutput(this, 'ApiURL', {
      value: apiUrl,
    });

    nextJsExport(
      'https://rkuyqaqng4.execute-api.us-west-2.amazonaws.com/default/',
    );

    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(`${process.cwd()}/front/out`)],
      destinationBucket: s3bucket,
      destinationKeyPrefix: '/',
      exclude: ['.DS_Store', '*/.DS_Store'],
      prune: true,
      retainOnDelete: false,
      role: deployRole,
    });
  }
}
