import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as CustomImageTest from '../lib/custom-image-test-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CustomImageTest.CustomImageTestStack(app, 'MyTestStack', {
    owner: '',
    repo: '',
    environment: '',
    buildspec: '',
    image: '',
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
