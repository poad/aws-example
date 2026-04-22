#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CloudfrontStack } from '../lib/cloudfront-stack.js';

const app = new cdk.App();
new CloudfrontStack(app, 'ec2-blugreen-cloudfront-sStack', {
});
