#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib/core';
import { CustomImageTestStack } from '../lib/custom-image-test-stack';

const app = new cdk.App();

const env = app.node.tryGetContext('env') as string;
const owner = app.node.tryGetContext('owner') as string;
const repo = app.node.tryGetContext('repo') as string;
const buildspec = app.node.tryGetContext('buildspec') as string;
const image = app.node.tryGetContext('image') as string;

new CustomImageTestStack(app, 'CustomImageTestStack', {
    owner,
    repo,
    buildspec,
    environment: env,
    image,
});
