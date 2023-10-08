#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import * as assert from 'assert';

const app = new cdk.App();
const config = app.node.tryGetContext('config');
assert(config, ''); 
new VpcStack(app, 'vpc-stack', {
  ...config,
});