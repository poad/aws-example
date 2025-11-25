import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { RustFunction } from 'cargo-lambda-cdk';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class RustRuntimeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new RustFunction(this, 'Rust function', {
      functionName: 'rust-lambda-example',
      manifestPath: './lambda/',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        RUST_BACKTRACE: '1',
      },
      timeout: cdk.Duration.minutes(1),
    });

    new lambda.FunctionUrl(this, 'FunctionUrl', {
      function: fn,
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  }
}
