#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AmplifyCdkStack } from '../lib/amplify-cdk-stack';

const app = new cdk.App();
const accessToken = app.node.tryGetContext('token') as string;

new AmplifyCdkStack(app, 'amplify-cdk-stack', {
  accessToken
});