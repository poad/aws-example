#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { TinyDeviceFlowStack } from '../lib/tiny-device-flow-stack';
import { nextJsExport } from '../lib/process/setup';

nextJsExport();

const app = new cdk.App();
const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env);

// eslint-disable-next-line no-new
new TinyDeviceFlowStack(app, `${env}-tiny-device-flow-stack`, {
  name: `${env}-tiny-device-flow`,
  environment: env,
  ...context,
});
