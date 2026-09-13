#!/usr/bin/env node
import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack.js';

const app = new cdk.App();
const config = app.node.tryGetContext('config');
assert(config, '');
new VpcStack(app, 'Vpc', {
  ...config,
});
