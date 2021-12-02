#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { CognitoLambdaStack, GroupConfig } from '../lib/cognito-lambda-stack';

interface Context {
  region: string,
  domain: string,
  clientId: string,
  idPoolId: string,
  userPoolId: string,
  s3Region: string,
  groups: GroupConfig[],
  s3Bucket: string,
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const region = context.region;
const groups = context.groups;

const domain = context.domain;
const s3Region = context.s3Region;
const s3Bucket = context.s3Bucket;

new CognitoLambdaStack(app, 'CognitoLambdaStack', {
  name: 'cognito-lambda',
  region,
  groups,
  environment: env,
  env: {
    region,
  },
  domain,
  s3Region,
  s3Bucket,
});
