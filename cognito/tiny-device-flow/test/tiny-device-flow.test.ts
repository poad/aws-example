import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as TinyDeviceFlow from '../lib/tiny-device-flow-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new TinyDeviceFlow.TinyDeviceFlowStack(app, 'MyTestStack', {
    name: 'test',
    userPool: 'test',
    region: 'test',
    environment: 'test',
    domain: 'test',
    scopes: {
      phone: false,
      email: false,
      openid: true,
      profile: false,
      'aws.cognito.signin.user.admin': false,
    },
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
