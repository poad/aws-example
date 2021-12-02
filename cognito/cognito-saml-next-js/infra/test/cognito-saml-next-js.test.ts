import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as CognitoSamlNextJs from '../lib/cognito-saml-next-js-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CognitoSamlNextJs.CognitoSamlNextJsStack(app, 'MyTestStack', {
    environment: 'test',
    domain: 'test'
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
