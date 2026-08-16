#!/usr/bin/env node
import { S3Stack } from '../lib/s3-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();
new S3Stack(app, 'InfraS3', {
});
