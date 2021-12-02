import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as Python from '../lib/python-lambda-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Python.PythonLambdaStack(app, 'MyTestStack', { targetTags: [''] });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
