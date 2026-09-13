/* eslint-disable vitest/expect-expect */

import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { test } from 'vitest';
import * as CustomImageTest from '../lib/custom-image-test-stack.js';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CustomImageTest.CustomImageTestStack(app, 'MyTest', {
    owner: '',
    repo: '',
    environment: '',
    buildspec: '',
    image: '',
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    Resources: {},
  });
});

/* eslint-enable vitest/expect-expect */
