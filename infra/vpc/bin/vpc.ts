#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack.js';
import assert from 'assert';

const app = new cdk.App();
const config = app.node.tryGetContext('config');
assert(config, '');
new VpcStack(app, 'vpc-stack', {
  ...config,
});
