#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { NextTRpcExampleStack } from '../lib/next-trpc-example-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('env');
const config = app.node.tryGetContext(environment);

// eslint-disable-next-line no-new
new NextTRpcExampleStack(app, 'next-trpc-example-stack', {
  environment,
  ...config,
});
