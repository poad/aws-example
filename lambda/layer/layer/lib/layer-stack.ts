import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

interface LayerStackProps extends StackProps {
  appName: string,
  timestamp: string | undefined
}

// eslint-disable-next-line import/prefer-default-export
export class LayerStack extends Stack {
  constructor(scope: Construct, id: string, props: LayerStackProps) {
    super(scope, id, props);

    const { appName, timestamp } = props;
    const suffix = timestamp ? `-${timestamp}` : '';

    const layer = new lambda.LayerVersion(this, 'LambdaLayerVersion', {
      code: lambda.Code.fromAsset('src'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      layerVersionName: `${appName}-lambda-layer-version${suffix}`,
    });

    // eslint-disable-next-line no-new
    new StringParameter(this, 'LayerArnParameterStore', {
      parameterName: `${appName}-lambda-layer-version${suffix}-arn`,
      stringValue: layer.layerVersionArn,
    });
  }
}
