import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';

interface FunctionStackProps extends StackProps {
  appName: string,
  timestamp: string | undefined
}

export class FunctionStack extends Stack {
  constructor(scope: Construct, id: string, props: FunctionStackProps) {
    super(scope, id, props);

    const { appName, timestamp } = props;
    const suffix = timestamp ? `-${timestamp}` : '';

    const parameter = StringParameter.fromStringParameterName(
      this,
      'LayerArnParameterStore',
      `${appName}-lambda-layer-version${suffix}-arn`);

    new lambda.Function(this, "LambdaFunction", {
      functionName: `${appName}${suffix}`,
      code: lambda.Code.fromAsset("handler"),
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_14_X,
      layers: [LayerVersion.fromLayerVersionArn(this, "LambdaLayerVersion", parameter.stringValue)],
    });

  }
}
