import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as CodebuildGhaLambdaRunnerExample from '../lib/codebuild-gha-lambda-runner-example-stack';
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { test } from 'vitest';

// example test. To run these tests, uncomment this file along with the
// example resource in lib/codebuild-gha-lambda-runner-example-stack.ts
test('SQS Queue Created', () => {
  const app = new cdk.App();
    // WHEN
  const stack = new CodebuildGhaLambdaRunnerExample.CodebuildGhaLambdaRunnerExampleStack(app, 'MyTestStack', {
    projects: [
      {
        projectName: "codebuild-gha-lambda-runner-example-rust-dev1",
        owner: "poad",
        repo: "aws-codebuild-github-lambda-runner-rust-example",
        buildImage: codebuild.LinuxLambdaBuildImage.AMAZON_LINUX_2023_NODE_20,
        prefix: 'Rust',
        customImage: 'public.ecr.aws/docker/library/rust:latest',
      }
    ]
  });
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
