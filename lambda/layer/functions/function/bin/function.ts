#!/usr/bin/env node
import { FunctionStack } from '../lib/function-stack.js';
import { compileBundles } from '../lib/process/setup.js';
import * as cdk from 'aws-cdk-lib';

compileBundles();

const app = new cdk.App();
const timestamp = app.node.tryGetContext('timestamp') as string | undefined;
const appName = 'loose-linkage-lambda-layer';
 
new FunctionStack(app, `${appName}-function${timestamp ? `-${timestamp}` : ''}`, {
  appName,
  timestamp,
});
