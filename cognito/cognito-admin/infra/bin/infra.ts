#!/usr/bin/env node
import 'source-map-support/register';
import { InfraStack } from '../lib/infra-stack';
import { App } from '@aws-cdk/core';


interface Context {
  region: string,
  domain: string,
  endUserDomain: string,
  clientId: string,
  idPoolId: string,
  userPoolId: string,
  provider: string,
  triggers: {
    preSignUp: boolean,
    preAuth: boolean,
    postAuth: boolean,
    defAuthChallenge: boolean,
    createAuthChallenge: boolean,
    verifyAuthChallenge: boolean,
    postConfirm: boolean,
    preGenToken: boolean,
    customMessge: boolean,
    userMigrate: boolean,
  },
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const { region, domain, endUserDomain, provider } = context;

new InfraStack(app, `${env}-cognito-admin-stack`, {
  name: `${env}-cognito-admin`,
  adminUserPool: `${env}-cognito-admin-user-pool`,
  endUserPool: `${env}-cognito-admin-end-user-pool`,
  region,
  environment: env,
  env: {
    region,
  },
  domain,
  endUserDomain,
  provider,
  Lambda: {
    app: {
      userMaagement: {
        name: "dev-signin-api",
        entry: "lambda/signin/index.ts"
      },
    },
  }
});
