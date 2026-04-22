#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { S3Stack } from '../lib/s3-stack.js';

const app = new cdk.App();
new S3Stack(app, 'infra-s3-stack', {
});
