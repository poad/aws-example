#!/usr/bin/env node
import { CloudfrontStack } from '../lib/cloudfront-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
new CloudfrontStack(app, 'Ec2BlugreenCloudfront', {
});
