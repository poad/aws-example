#!/usr/bin/env node
import { CodebuildGhaLambdaRunnerExampleStack } from '../lib/codebuild-gha-lambda-runner-example-stack.js';
import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';

const projects = [
  {
    projectName: 'codebuild-gha-lambda-runner-example-rust-dev1',
    owner: 'poad',
    repo: 'aws-codebuild-github-lambda-runner-rust-example',
    buildImage: codebuild.LinuxLambdaBuildImage.AMAZON_LINUX_2023_NODE_22,
    prefix: 'Rust',
    customImage: 'public.ecr.aws/docker/library/rust:latest',
  },
];

const app = new cdk.App();
new CodebuildGhaLambdaRunnerExampleStack(
  app,
  'codebuild-gha-lambda-runner-example-stack',
  {
    projects,
  },
);
