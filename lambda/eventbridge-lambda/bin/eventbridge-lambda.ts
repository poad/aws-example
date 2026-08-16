#!/usr/bin/env node
import { EventbridgeLambdaStack } from '../lib/eventbridge-lambda-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
new EventbridgeLambdaStack(app, 'EventbridgeLambda', {
});
