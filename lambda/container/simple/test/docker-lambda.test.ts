import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as DockerLambdaStack from '../lib/docker-lambda-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new DockerLambdaStack.DockerLambdaStack(app, 'MyTestStack', {
    name: 'cognito-lambda',
    environment: 'dev',
    env: {
      region: 'us-west-2',
    },
    region: 'us-west-2',
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
