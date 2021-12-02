import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as Infra from '../lib/infra-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Infra.InfraStack(app, 'MyTestStack', {
    userPoolId: '',
    idPoolId: '',
    bucket: '',
    groups: [],
    env: {
      region: ''
    }
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
