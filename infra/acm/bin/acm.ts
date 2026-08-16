#!/usr/bin/env node
import { AcmStack } from '../lib/acm-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

new AcmStack(app, 'Acm', {
});
