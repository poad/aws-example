import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as HelloRustLambda from '../lib/hello-rust-lambda-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new HelloRustLambda.HelloRustLambdaStack(app, 'MyTestStack', {
    name: 'test-hello-rust-lambda',
    region: 'us-west-2',
    environment: 'test',
    env: {
      region: 'us-west-2',
    },
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
