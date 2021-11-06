import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CognitoSamlNextJs from '../lib/cognito-saml-next-js-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CognitoSamlNextJs.CognitoSamlNextJsStack(app, 'MyTestStack', {
      environment: 'test',
      domain: 'test'
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT));
});
