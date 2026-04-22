#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { EventbridgeLambdaStack } from '../lib/eventbridge-lambda-stack.js';

const app = new cdk.App();
new EventbridgeLambdaStack(app, 'EventbridgeLambdaStack', {
});
