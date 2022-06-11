#!/usr/bin/env node
import 'source-map-support/register';
import { InfraStack } from '../lib/infra-stack';
import { App } from 'aws-cdk-lib';


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
  groupRoleClassificationTagName: string | undefined,
  groupRoleClassificationTagValue: string | undefined,
  testRoles: number | undefined,
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const { region, domain, endUserDomain, provider, testRoles, groupRoleClassificationTagName, groupRoleClassificationTagValue } = context;

new InfraStack(app, `${env}-cognito-admin-stack`, {
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
  lambda: {
    app: {
      userMaagement: {
        name: "dev-signin-api",
        entry: "lambda/signin/index.ts"
      },
    },
  },
  groupRoleClassificationTag: {
    name: groupRoleClassificationTagName,
    value: groupRoleClassificationTagValue
  },
  testRoles,
});
