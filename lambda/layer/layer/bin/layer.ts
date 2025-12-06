#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LayerStack } from '../lib/layer-stack.js';
import { compileBundles } from '../lib/process/setup.js';

compileBundles();
const app = new cdk.App();
const timestamp = app.node.tryGetContext('timestamp') as string | undefined;
const appName = 'loose-linkage-lambda-layer';
// eslint-disable-next-line no-new
new LayerStack(app, `${appName}${timestamp ? `-${timestamp}` : ''}`, {
  appName,
  timestamp,
});
