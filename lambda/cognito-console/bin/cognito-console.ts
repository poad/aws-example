#!/usr/bin/env node
import 'source-map-support/register';
import { App } from '@aws-cdk/core';
import { CognitoConsoleStack, GroupConfig } from '../lib/cognito-console-stack';

interface Context {
  region: string,
  domain: string,
  clientId: string,
  idPoolId: string,
  userPoolId: string,
  groups: GroupConfig[],
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const region = context.region;
const groups = context.groups;

const domain = context.domain;

new CognitoConsoleStack(app, 'CognitoConsoleStack', {
  name: 'cognito-console',
  region,
  groups,
  environment: env,
  env: {
    region,
  },
  domain,
});
