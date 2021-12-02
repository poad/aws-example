import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as CognitoAwsConsoleInfra from '../lib/cognito-aws-console-infra-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CognitoAwsConsoleInfra.CognitoAwsConsoleInfraStack(app, 'MyTestStack', { environment: '', groups: [] });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
