#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Cloud9Stack } from '../lib/cloud9-stack';

const app = new cdk.App();

const name = app.node.tryGetContext('name');
const ami = app.node.tryGetContext('amiId');
const vpc = app.node.tryGetContext('vpc');
const subnet = app.node.tryGetContext('subnet');
const instanceType = app.node.tryGetContext('instanceType') || 't3a.small';

const account = app.node.tryGetContext('account');
const region = app.node.tryGetContext('region');
const c9cidrs = app.node.tryGetContext('c9cidrs');

new Cloud9Stack(app, `${name ? `${name}-` : ''}cloud9-stack`, {
  name: name || 'cloud9',
  ami,
  vpc,
  subnet,
  instanceType,
  c9cidrs,
  env: {
    account,
    region,
  }
});