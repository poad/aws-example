#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { LambdaExamplesStack, GroupConfig } from '../lib/lambda-examples-stack';

interface Context {
  region: string,
  domain: string,
  auth0Domain?: string,
  clientId: string,
  idPoolId: string,
  userPoolId: string,
  groups: GroupConfig[],
  providers?: string,
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
const tags = (app.node.tryGetContext('tags') as string).split(',');

const { region, groups, domain, providers } = context;


let triggers = {};
if (context.triggers.preSignUp) {
  triggers = {
    ...triggers, preSignUp: {
      name: "dev-trigger-pre-sign-up",
      entry: "lambda/cognito-console-triggers/pre-sign-up/index.ts"
    }
  }
}

if (context.triggers.preAuth) {
  triggers = {
    ...triggers, preAuth: {
      name: "dev-trigger-pre-auth",
      entry: "lambda/cognito-console-triggers/pre-auth/index.ts"
    }
  }
}

if (context.triggers.postAuth) {
  triggers = {
    ...triggers, postAuth: {
      name: "dev-trigger-post-auth",
      entry: "lambda/cognito-console-triggers/post-auth/index.ts"
    }
  }
}

if (context.triggers.defAuthChallenge) {
  triggers = {
    ...triggers, defAuthChallenge: {
      name: "dev-trigger-def-auth-challenge",
      entry: "lambda/cognito-console-triggers/def-auth-challenge/index.ts"
    }
  }
}

if (context.triggers.createAuthChallenge) {
  triggers = {
    ...triggers, createAuthChallenge: {
      name: "dev-trigger-create-auth-challenge",
      entry: "lambda/cognito-console-triggers/create-auth-challenge/index.ts"
    }
  }
}

if (context.triggers.verifyAuthChallenge) {
  triggers = {
    ...triggers, verifyAuthChallenge: {
      name: "dev-trigger-verify-auth-challenge",
      entry: "lambda/cognito-console-triggers/verify-auth-challenge/index.ts"
    }
  }
}

if (context.triggers.postConfirm) {
  triggers = {
    ...triggers, postConfirm: {
      name: "dev-trigger-post-confirm",
      entry: "lambda/cognito-console-triggers/post-confirm/index.ts"
    }
  }
}

if (context.triggers.preGenToken) {
  triggers = {
    ...triggers, preGenToken: {
      name: "dev-trigger-pre-token-gen",
      entry: "lambda/cognito-console-triggers/pre-token-gen/index.ts"
    }
  }
}

if (context.triggers.userMigrate) {
  triggers = {
    ...triggers, userMigrate: {
      name: "dev-trigger-user-migration",
      entry: "lambda/cognito-console-triggers/user-migration/index.ts"
    }
  }
}

if (context.triggers.customMessge) {
  triggers = {
    ...triggers, customMessge: {
      name: "dev-trigger-custom-message",
      entry: "lambda/cognito-console-triggers/custom-message/index.ts"
    }
  }
}

new LambdaExamplesStack(app, `${env}-lambda-stack`, {
  name: `${env}-lambda`,
  region,
  groups,
  environment: env,
  env: {
    region
  },
  domain,
  providers,
  Lambda: {
    app: {
      signIn: {
        name: "dev-signin-api",
        entry: "lambda/signin/index.ts"
      },
      signOut: {
        name: "dev-signout-api",
        entry: "lambda/signout/index.ts"
      },
      userInfo: {
        name: "dev-userinfo-api",
        entry: "lambda/user-info/index.ts"
      },
    },
    triggers,
  },
  targetTags: tags
});
