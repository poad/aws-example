#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { DockerLambdaStack } from '../lib/docker-lambda-stack';

interface Context {
  region: string,
}

const app = new App();

const env = app.node.tryGetContext('env') as string;

const context = app.node.tryGetContext(env) as Context;
const region = context.region;

new DockerLambdaStack(app, `${env}-docker-lambda-stack`, {
  name: `${env}-docker-lambda`,
  region,
  environment: env,
  env: {
    region,
  },
});
