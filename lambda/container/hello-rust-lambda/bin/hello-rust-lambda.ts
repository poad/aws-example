#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { HelloRustLambdaStack } from '../lib/hello-rust-lambda-stack';

interface Context {
  region: string,
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const region = context.region;

new HelloRustLambdaStack(app, 'HelloRustLambdaStack', {
  name: `${env}-hello-rust-lambda`,
  region,
  environment: env,
  env: {
    region,
  },
});
