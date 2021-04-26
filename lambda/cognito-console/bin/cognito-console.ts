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

new CognitoConsoleStack(app, `${env}-cognito-console-stack`, {
  name: `${env}-cognito-console`,
  region,
  groups,
  environment: env,
  env: {
    region,
  },
  domain,
  Lambda: {
    app: {
      name: "dev-signin-api",
      entry: "lambda/signin/index.ts"}
    ,
    triggers: {
      postConfirm: {
        name: "dev-trigger-post-confirm",
        entry: "lambda/triggers/post-confirm/index.ts"
      },
    },
  }
});
