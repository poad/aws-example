#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CodeconectionsStack } from '../lib/codeconections-stack';

const app = new cdk.App();

const account = app.node.tryGetContext('acccount');

new CodeconectionsStack(app, 'CodeconectionsStack', {
  env: {
    account,
    region: 'us-west-2',
  },
});
