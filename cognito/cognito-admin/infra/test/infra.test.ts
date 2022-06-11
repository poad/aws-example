import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib';
import * as Infra from '../lib/infra-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Infra.InfraStack(app, 'MyTestStack', {
    adminUserPool: `test-user-pool`,
    endUserPool: `test-end-user-pool`,
    region: 'us-west-2',
    environment: 'test',
    env: {
      region: 'us-west-2',
    },
    domain: 'test',
    endUserDomain: 'test',
    provider: 'test',
    lambda: {
      app: {
        userMaagement: {
          name: "dev-signin-api",
          entry: "lambda/signin/index.ts"
        },
      },
    },
    groupRoleClassificationTag: {
      name: undefined,
      value: undefined
    },
    testRoles: undefined
  });
  // THEN
  const template = Template.fromStack(stack);
  template.templateMatches({
    "Resources": {}
  })
});
