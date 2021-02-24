import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CustomImageTest from '../lib/custom-image-test-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CustomImageTest.CustomImageTestStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
