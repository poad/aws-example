#!/usr/bin/env node
import assert from 'assert';
import * as cdk from 'aws-cdk-lib';
import { Ec2Stack } from '../lib/ec2-stack.js';

const app = new cdk.App();

const amiId = app.node.tryGetContext('ami-id') ?? 'ami-09afa82eb636e4c53';
const config = app.node.tryGetContext('config');

assert(config, '');

new Ec2Stack(app, 'Ec2BluegreenEc2', {
  amiId,
  ...config,
});
