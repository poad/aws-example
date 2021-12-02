import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as CognitoLambda from '../lib/cognito-lambda-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CognitoLambda.CognitoLambdaStack(app, 'MyTestStack', {
    name: 'cognito-lambda',
    groups: [],
    environment: 'dev',
    env: {
      region: 'us-west-2',
    },
    domain: 'test',
    s3Region: 'us-west-2',
    s3Bucket: 'test',
    region: 'us-west-2',
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
