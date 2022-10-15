#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EventbridgeLambdaStack } from '../lib/eventbridge-lambda-stack';

const app = new cdk.App();
// eslint-disable-next-line no-new
new EventbridgeLambdaStack(app, 'EventbridgeLambdaStack', {
});
