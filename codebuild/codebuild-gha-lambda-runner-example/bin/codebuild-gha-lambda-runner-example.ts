#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import { CodebuildGhaLambdaRunnerExampleStack } from "../lib/codebuild-gha-lambda-runner-example-stack";

const projects = [
  {
    projectName: "codebuild-gha-lambda-runner-example",
    owner: "poad",
    repo: "aws-codebuild-github-lambda-runner-node-example",
    buildImage: codebuild.LinuxArmLambdaBuildImage.AMAZON_LINUX_2023_NODE_20,
    prefix: '',
  },
  {
    projectName: "codebuild-gha-lambda-runner-example-rust-dev1",
    owner: "poad",
    repo: "aws-codebuild-github-lambda-runner-rust-example",
    buildImage: codebuild.LinuxLambdaBuildImage.AMAZON_LINUX_2023_NODE_20,
    prefix: 'Rust',
    customImage: 'public.ecr.aws/docker/library/rust:latest',
  },
];

const app = new cdk.App();
new CodebuildGhaLambdaRunnerExampleStack(
  app,
  "codebuild-gha-lambda-runner-example-stack",
  {
    projects,
  },
);
