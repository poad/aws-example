#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AmplifyCdkStack } from '../lib/amplify-cdk-stack.js';

const app = new cdk.App();
const accessToken = app.node.tryGetContext('token') as string;

new AmplifyCdkStack(app, 'amplify-cdk-stack', {
  accessToken
});
