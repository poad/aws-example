#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { CognitoLambdaStack, GroupConfig } from '../lib/cognito-lambda-stack';

const app = new App();

const region = app.node.tryGetContext('region') as string;
const env = app.node.tryGetContext('env') as string;
const groups = app.node.tryGetContext('groups') as GroupConfig[];

const domain = app.node.tryGetContext('domain') as string;
const clientId = app.node.tryGetContext('clientId') as string;
const idPoolId = app.node.tryGetContext('idPoolId') as string;
const userPoolId = app.node.tryGetContext('userPoolId') as string;
const s3Region = app.node.tryGetContext('s3Region') as string;
const s3Bucket = app.node.tryGetContext('s3Bucket') as string;

const identityProvider = `cognito-idp.${region}.amazonaws.com/${userPoolId}`;

new CognitoLambdaStack(app, 'CognitoLambdaStack', {
  name: 'cognito-lambda',
  region,
  groups,
  environment: env,
  env: {
    region,
  },
  domain,
  clientId,
  idPoolId,
  identityProvider,
  s3Region,
  s3Bucket,
});
