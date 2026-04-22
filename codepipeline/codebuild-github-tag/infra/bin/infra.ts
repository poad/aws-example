#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack.js';

const app = new cdk.App();
new InfraStack(app, 'codebuild-github-tag-infra-stack', {
  ...app.node.tryGetContext('params')
});
