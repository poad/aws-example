#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { TinyDeviceFlowStack } from '../lib/tiny-device-flow-stack';
import { nextJsExport } from '../lib/process/setup';

interface Context {
  region: string,
  domain: string,
  userPool: string,
}

nextJsExport('/oauth/device/activate');

const app = new cdk.App();
const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const { region, domain, userPool } = context;

new TinyDeviceFlowStack(app, `${env}-tiny-device-flow-stack`, {
  name: `${env}-tiny-device-flow`,
  userPool,
  region,
  environment: env,
  domain,
});
