#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthorizerExampleStack } from '../lib/authorizer-example-stack';

const app = new cdk.App();
const environment = app.node.tryGetContext('env');
const userPoolName = app.node.tryGetContext('userPoolName');
const config = app.node.tryGetContext(environment);

// eslint-disable-next-line no-new
new AuthorizerExampleStack(app, 'AuthorizerExampleStack', {
  environment,
  userPoolName,
  ...config,
});
