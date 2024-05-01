#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CodebuildGhaLambdaRunnerExampleStack } from "../lib/codebuild-gha-lambda-runner-example-stack";

const app = new cdk.App();
new CodebuildGhaLambdaRunnerExampleStack(
  app,
  "codebuild-gha-lambda-runner-example-stack",
  {},
);
