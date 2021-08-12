import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
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
    
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
