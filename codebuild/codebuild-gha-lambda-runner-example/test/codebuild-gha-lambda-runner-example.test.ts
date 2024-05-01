import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as CodebuildGhaLambdaRunnerExample from '../lib/codebuild-gha-lambda-runner-example-stack';
import { test } from 'vitest';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/codebuild-gha-lambda-runner-example-stack.ts
test('SQS Queue Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new CodebuildGhaLambdaRunnerExample.CodebuildGhaLambdaRunnerExampleStack(app, 'MyTestStack');
    // THEN
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::CodeBuild::Project', {
    Triggers: {
        FilterGroups: [
            [
                {
                    Pattern: 'WORKFLOW_JOB_QUEUED',
                }
            ]
        ]
    },
  });
});
