import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class HelloMcpServerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const webAdapter = cdk.aws_lambda.LayerVersion
      .fromLayerVersionArn(
        this,
        'LayerVersion',
        `arn:aws:lambda:${this.region}:753240598075:layer:LambdaAdapterLayerArm64:25`)

    const functionName = 'hello-mcp-server';

    const logGroup = new cdk.aws_logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${functionName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
    })
    const fn = new cdk.aws_lambda_nodejs.NodejsFunction(this, 'Lambda', {
      functionName,
      architecture: cdk.aws_lambda.Architecture.ARM_64,
      runtime: cdk.aws_lambda.Runtime.NODEJS_22_X,
      entry: './lambda/index.ts',
      handler: 'run.sh',
      retryAttempts: 0,
      layers: [webAdapter],
      logGroup,
      environment: {
        // Lambda Web Adapter の設定
        AWS_LAMBDA_EXEC_WRAPPER: '/opt/bootstrap',
        AWS_LWA_INVOKE_MODE: 'response_stream',
        RUST_LOG: 'info',
        PORT: '8080',
        NODE_PATH: '/opt/nodejs/node_modules',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 128,
      bundling: {
        commandHooks: {
          afterBundling: (inputDir: string, outputDir: string) => [
            `cp ${inputDir}/lambda/hello-mcp-server/lambda/run.sh ${outputDir}`,
          ],
          beforeInstall(): string[] {
            return [''];
          },
          beforeBundling(): string[] {
            return [''];
          },
        },
        externalModules: [
          // Lambda レイヤーで提供されるモジュールは除外できる（オプション）
          '/opt/nodejs/node_modules/aws-lambda-web-adapter',

          'dotenv',
        ],
        nodeModules: ['express'], // 依存関係を指定
        // minify: true, // コードの最小化
        sourceMap: true, // ソースマップを有効化（デバッグ用）
        keepNames: true,
        format: cdk.aws_lambda_nodejs.OutputFormat.ESM,
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
