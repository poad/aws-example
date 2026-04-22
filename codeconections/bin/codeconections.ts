#!/usr/bin/env node
import { CodeconectionsStack } from '../lib/codeconections-stack.js';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

const account = app.node.tryGetContext('acccount');

new CodeconectionsStack(app, 'CodeconectionsStack', {
  env: {
    account,
    region: 'us-west-2',
  },
});
