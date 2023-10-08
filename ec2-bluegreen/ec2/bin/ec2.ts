#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Ec2Stack } from '../lib/ec2-stack';
import assert = require('assert');

const app = new cdk.App();

const amiId = app.node.tryGetContext('ami-id') ?? 'ami-09afa82eb636e4c53';
const config = app.node.tryGetContext('config');

assert(config, '');

new Ec2Stack(app, 'ec2-bluegreen-ec2-stack', {
  amiId,
  ...config,
});