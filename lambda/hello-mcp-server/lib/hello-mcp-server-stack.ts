import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class HelloMcpServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const functionName = 'hello-mcp-server';

    const logGroup = new cdk.aws_logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
    })
    const fn = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'Lambda', {
      functionName,
      architecture: cdk.aws_lambda.Architecture.ARM_64,
      runtime: cdk.aws_lambda.Runtime.NODEJS_24_X,
      entry: 'lambda/index.ts',
      retryAttempts: 0,
      logGroup,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        // No externalModules since we want to bundle everything
        nodeModules: [
          '@modelcontextprotocol/sdk',
          'hono',
          'zod',
        ],
        externalModules: [
          'dotenv',
          '@hono/node-server',
        ],
        minify: true, // コードの最小化
        sourceMap: false,
        keepNames: true,
        format: cdk.aws_lambda_nodejs.OutputFormat.ESM,
        target: 'node22', // Target Node.js 22.x
        banner: 'import { createRequire } from \'module\';const require = createRequire(import.meta.url);',
      },
      loggingFormat: cdk.aws_lambda.LoggingFormat.JSON,
    });

    new cdk.aws_lambda.FunctionUrl(this, 'LambdaFunctionUrl', {
      function: fn,
      authType: cdk.aws_lambda.FunctionUrlAuthType.NONE,
      invokeMode: cdk.aws_lambda.InvokeMode.RESPONSE_STREAM,
    });
  }
}
