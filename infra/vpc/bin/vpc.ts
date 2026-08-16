#!/usr/bin/env node
import assert from 'assert';
import { VpcStack } from '../lib/vpc-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
const config = app.node.tryGetContext('config');
assert(config, '');
new VpcStack(app, 'Vpc', {
  ...config,
});
