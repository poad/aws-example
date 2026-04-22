#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AcmStack } from '../lib/acm-stack.js';

const app = new cdk.App();

new AcmStack(app, 'acm-stack', {
});
