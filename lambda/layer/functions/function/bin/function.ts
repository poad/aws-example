#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FunctionStack } from '../lib/function-stack';
import { compileBundles } from '../lib/process/setup';

compileBundles();

const app = new cdk.App();
const timestamp = app.node.tryGetContext('timestamp') as string | undefined;
const appName = 'loose-linkage-lambda-layer';
new FunctionStack(app, `${appName}-function${timestamp ? `-${timestamp}` : ''}`, {
  appName,
  timestamp
});
