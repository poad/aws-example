#!/usr/bin/env node
import { LayerStack } from '../lib/layer-stack.js';
import { compileBundles } from '../lib/process/setup.js';
import * as cdk from 'aws-cdk-lib';

compileBundles();
const app = new cdk.App();
const timestamp = app.node.tryGetContext('timestamp') as string | undefined;
const appName = 'loose-linkage-lambda-layer';
 
new LayerStack(app, `${appName}${timestamp ? `-${timestamp}` : ''}`, {
  appName,
  timestamp,
});
