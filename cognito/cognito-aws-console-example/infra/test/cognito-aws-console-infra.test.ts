import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as CognitoAwsConsoleInfra from '../lib/cognito-aws-console-infra-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CognitoAwsConsoleInfra.CognitoAwsConsoleInfraStack(app, 'MyTestStack', { environment: '', groups: [] });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
